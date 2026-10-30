//! Changelog deduplication (postgres-only, driven by the scheduled dedup task).
//!
//! The changelog is append-only, so a record accumulates one row per change.
//! Dedup keeps only the newest row per (table_name, record_id, row_action) group
//! and deletes the rest.
//!
//! `changelog` is partitioned, and Postgres has no non-blocking index build or
//! drop for a partitioned table. So the helper index is built per partition with
//! `CONCURRENTLY`, which coexists with changelog reads and inserts, and every
//! statement that can wait on a lock runs under a `lock_timeout`. A timeout ends
//! the run as [`DedupRun::LockedOut`]; the next tick retries.
//!
//! [`ChangelogRepository::dedup`] MUST be called outside a `transaction_sync`:
//! Postgres refuses `CONCURRENTLY` inside a transaction, and the per-batch
//! deletes commit independently.

use super::partition::{is_lock_timeout, range_partitions};
use crate::{
    ChangelogRepository, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
};
use diesel::{
    prelude::*,
    sql_types::{BigInt, Text},
};
use std::time::Instant;

/// The whole-table helper index earlier releases built on `changelog`. A server
/// stopped mid-run keeps it.
const LEGACY_INDEX: &str = "index_changelog_dedup";

/// Waiting on a concurrent build or drop blocks nobody, so this only bounds how
/// long a run keeps trying.
const CONCURRENT_LOCK_TIMEOUT: &str = "5s";

/// Dropping [`LEGACY_INDEX`] takes ACCESS EXCLUSIVE on `changelog`: while it
/// waits, every changelog read and insert queues behind it.
const BLOCKING_LOCK_TIMEOUT: &str = "500ms";

/// Outcome of one [`ChangelogRepository::dedup`] pass.
#[derive(Debug, PartialEq, Eq)]
pub enum DedupRun {
    /// Every duplicate in the window is deleted and the marker advanced.
    /// `indexes_left`: a lock timeout stopped the helper indexes being dropped;
    /// the next run drops them before building its own.
    Completed { removed: u64, indexes_left: bool },
    /// A lock timeout stopped the run before any row was deleted. The marker
    /// is unchanged, so the next tick redoes the window.
    LockedOut(DedupStage),
}

/// Where a [`DedupRun::LockedOut`] run stopped.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum DedupStage {
    /// Dropping the whole-table `index_changelog_dedup` an earlier release left behind.
    LegacyIndex,
    /// Dropping leftover helper indexes and building this window's.
    HelperIndexes,
}

/// Name of the helper index on one partition.
fn helper_index_name(partition: &str) -> String {
    format!("index_changelog_dedup_{partition}")
}

impl<'a> ChangelogRepository<'a> {
    /// Run one dedup pass over the window `(marker, max]`: `marker` is the highest
    /// cursor an earlier run fully deduplicated (`KeyType::ChangelogDedupCursor`)
    /// and `max` the current safe cursor, never past an in-flight changelog
    /// transaction. Deletes in committed batches of `batch_size`. The marker
    /// advances only once every delete is done, so a run cut short by a lock
    /// timeout is redone from the same marker next tick.
    ///
    /// No-op under SQLite: remotes have small, unpartitioned changelogs.
    pub fn dedup(&self, batch_size: i64) -> Result<DedupRun, RepositoryError> {
        if !cfg!(feature = "postgres") {
            return Ok(DedupRun::Completed {
                removed: 0,
                indexes_left: false,
            });
        }

        if self.drop_legacy_index()?.is_none() {
            return Ok(DedupRun::LockedOut(DedupStage::LegacyIndex));
        }

        let kv = KeyValueStoreRepository::new(self.connection);
        let marker = kv.get_i64(KeyType::ChangelogDedupCursor)?.unwrap_or(0);
        let max = self.max_cursor()? as i64;
        if max <= marker {
            return Ok(DedupRun::Completed {
                removed: 0,
                indexes_left: false,
            });
        }

        if self.prepare_dead_set(marker, max)?.is_none() {
            return Ok(DedupRun::LockedOut(DedupStage::HelperIndexes));
        }

        let mut removed: u64 = 0;
        loop {
            let n = self.delete_dead_batch(batch_size)?;
            removed += n;
            if n == 0 {
                break;
            }
        }

        let indexes_left = self.finish_dead_set()?.is_none();
        kv.set_i64(KeyType::ChangelogDedupCursor, Some(max))?;

        Ok(DedupRun::Completed {
            removed,
            indexes_left,
        })
    }

    /// Drop the whole-table [`LEGACY_INDEX`] if it exists. It is a partitioned
    /// index, which Postgres cannot drop concurrently, so the plain drop runs in
    /// a transaction under the short [`BLOCKING_LOCK_TIMEOUT`]. `None` on lock
    /// timeout. When the index does not exist nothing is locked.
    fn drop_legacy_index(&self) -> Result<Option<()>, RepositoryError> {
        if !relation_exists(self.connection, LEGACY_INDEX)? {
            return Ok(Some(()));
        }
        let result = self.connection.transaction_sync(|connection| {
            diesel::sql_query(format!(
                "SET LOCAL lock_timeout = '{BLOCKING_LOCK_TIMEOUT}'"
            ))
            .execute(connection.lock().connection())?;
            diesel::sql_query(format!("DROP INDEX IF EXISTS {LEGACY_INDEX}"))
                .execute(connection.lock().connection())?;
            Ok::<(), RepositoryError>(())
        });
        match result {
            Ok(()) => {
                log::warn!("changelog dedup: dropped {LEGACY_INDEX} left behind by an earlier run");
                Ok(Some(()))
            }
            Err(error) => {
                let error = error.to_inner_error();
                if is_lock_timeout(&error) {
                    Ok(None)
                } else {
                    Err(error)
                }
            }
        }
    }

    /// Build the helper indexes for the window `(marker, max]`, then
    /// `changelog_dead`, the set of cursors to delete. Step 1: within the window,
    /// keep each record's newest row and mark its older rows for deletion. Step 2:
    /// for any record in the window that also has rows at/below the marker (kept
    /// by a previous run), mark those for deletion too. `None` on lock timeout.
    fn prepare_dead_set(&self, marker: i64, max: i64) -> Result<Option<()>, RepositoryError> {
        log::info!("changelog dedup: prepare_dead_set window ({marker}, {max}]");

        // An interrupted concurrent build leaves an INVALID index behind, which
        // `IF NOT EXISTS` would quietly reuse: drop any leftover before building.
        if self.drop_helper_indexes()?.is_none() {
            return Ok(None);
        }
        if self.build_helper_indexes(marker, max)?.is_none() {
            return Ok(None);
        }

        // Fresh dead-set table each run (drop any leftover from an aborted run).
        diesel::sql_query("DROP TABLE IF EXISTS changelog_dead")
            .execute(self.connection.lock().connection())?;

        // Step 1: within the window, every row that is not the newest of its
        // group, with the partition that holds it so each batch can delete from
        // that partition directly.
        let t = Instant::now();
        diesel::sql_query(
            "CREATE TABLE changelog_dead AS \
             SELECT cursor, partition_name FROM ( \
                 SELECT cursor, tableoid::regclass::text AS partition_name, \
                     row_number() OVER ( \
                         PARTITION BY table_name, record_id, row_action ORDER BY cursor DESC \
                     ) AS rn \
                 FROM changelog \
                 WHERE cursor > $1 AND cursor <= $2 \
             ) s WHERE rn > 1",
        )
        .bind::<BigInt, _>(marker)
        .bind::<BigInt, _>(max)
        .execute(self.connection.lock().connection())?;
        log::info!(
            "changelog dedup: step 1 (build dead-set) in {:?}",
            t.elapsed()
        );

        // Step 2: handle records that reappear across the marker.
        // Step 1 only looks inside the window, so it can't see a record's older row
        // that lives below the marker (kept by a previous run). If such a record gets
        // a new row in this window, that old row is now stale. So: for every group
        // touched in the window, also mark its rows at/below the marker as dead.
        // The partitions below the marker have no helper index, so this scans them.
        let t = Instant::now();
        diesel::sql_query(
            "INSERT INTO changelog_dead \
             SELECT old.cursor, old.tableoid::regclass::text FROM changelog old \
             JOIN ( \
                 SELECT DISTINCT table_name, record_id, row_action \
                 FROM changelog WHERE cursor > $1 AND cursor <= $2 \
             ) w USING (table_name, record_id, row_action) \
             WHERE old.cursor <= $1",
        )
        .bind::<BigInt, _>(marker)
        .bind::<BigInt, _>(max)
        .execute(self.connection.lock().connection())?;
        log::info!(
            "changelog dedup: step 2 (old-part leftovers) in {:?}",
            t.elapsed()
        );

        // Index the dead-set so each batch's `ORDER BY cursor LIMIT` (in both the
        // changelog delete and the dead-set pop) is an index scan rather than a
        // full seq-scan + sort of the whole dead-set on every batch.
        let t = Instant::now();
        diesel::sql_query(
            "CREATE INDEX IF NOT EXISTS index_changelog_dead_cursor ON changelog_dead (cursor)",
        )
        .execute(self.connection.lock().connection())?;
        log::info!(
            "changelog dedup: built index_changelog_dead_cursor in {:?}",
            t.elapsed()
        );

        Ok(Some(()))
    }

    /// Build a helper index on each range partition overlapping `(marker, max]`,
    /// one `CREATE INDEX CONCURRENTLY` at a time. The DEFAULT partition is never
    /// touched: the partition top-up locks it, and the dedup must not queue
    /// behind that. `None` on lock timeout, which leaves the index being built
    /// INVALID for the next run to drop.
    fn build_helper_indexes(&self, marker: i64, max: i64) -> Result<Option<()>, RepositoryError> {
        self.with_lock_timeout(CONCURRENT_LOCK_TIMEOUT, |connection| {
            let mut partitions: Vec<_> = range_partitions(connection)?
                .into_iter()
                // Partition holds `lower..upper`; the window holds `marker + 1..=max`.
                .filter(|p| p.lower <= max && p.upper > marker + 1)
                .collect();
            partitions.sort_by_key(|p| p.lower);

            for partition in &partitions {
                let t = Instant::now();
                let index = helper_index_name(&partition.name);
                diesel::sql_query(format!(
                    "CREATE INDEX CONCURRENTLY {index} ON {} \
                     (table_name, record_id, row_action, cursor DESC)",
                    partition.name
                ))
                .execute(connection.lock().connection())?;
                log::info!("changelog dedup: built {index} in {:?}", t.elapsed());
            }
            Ok(())
        })
    }

    /// Drop every helper index, one `DROP INDEX CONCURRENTLY` at a time. Found by
    /// name, so an earlier run's leftovers go too. `None` on lock timeout, with
    /// the rest left for the next run.
    fn drop_helper_indexes(&self) -> Result<Option<()>, RepositoryError> {
        self.with_lock_timeout(CONCURRENT_LOCK_TIMEOUT, |connection| {
            for index in helper_index_names(connection)? {
                let t = Instant::now();
                diesel::sql_query(format!("DROP INDEX CONCURRENTLY IF EXISTS {index}"))
                    .execute(connection.lock().connection())?;
                log::info!("changelog dedup: dropped {index} in {:?}", t.elapsed());
            }
            Ok(())
        })
    }

    /// Delete one batch of dead cursors (and pop them from `changelog_dead`).
    /// A batch comes from a single partition, the one holding the lowest
    /// remaining dead cursor: cursors are range-partitioned, so the dead-set in
    /// cursor order walks the partitions in turn. Each call autocommits. Returns
    /// the number of changelog rows deleted; 0 means the dead-set is drained.
    fn delete_dead_batch(&self, batch_size: i64) -> Result<u64, RepositoryError> {
        #[derive(QueryableByName)]
        struct Partition {
            #[diesel(sql_type = Text)]
            partition_name: String,
        }
        let Some(Partition { partition_name }) =
            diesel::sql_query("SELECT partition_name FROM changelog_dead ORDER BY cursor LIMIT 1")
                .get_result::<Partition>(self.connection.lock().connection())
                .optional()?
        else {
            return Ok(0);
        };

        // Index-driven via the partition's PK; the affected-row count is this
        // batch's size.
        let n = diesel::sql_query(format!(
            "DELETE FROM {partition_name} \
             WHERE cursor IN ( \
                 SELECT cursor FROM changelog_dead \
                 WHERE partition_name = $1 ORDER BY cursor LIMIT $2 \
             )"
        ))
        .bind::<Text, _>(&partition_name)
        .bind::<BigInt, _>(batch_size)
        .execute(self.connection.lock().connection())? as i64;

        // Pop the same cursors from the dead-set (index-driven via index_changelog_dead_cursor).
        // A crash between the two deletes self-heals because `prepare_dead_set` rebuilds
        // `changelog_dead` from scratch each run.
        diesel::sql_query(
            "DELETE FROM changelog_dead \
             WHERE cursor IN ( \
                 SELECT cursor FROM changelog_dead \
                 WHERE partition_name = $1 ORDER BY cursor LIMIT $2 \
             )",
        )
        .bind::<Text, _>(&partition_name)
        .bind::<BigInt, _>(batch_size)
        .execute(self.connection.lock().connection())?;

        Ok(n as u64)
    }

    /// Drop the dead-set table and the helper indexes after a run. `None` on
    /// lock timeout while dropping the indexes.
    fn finish_dead_set(&self) -> Result<Option<()>, RepositoryError> {
        diesel::sql_query("DROP TABLE IF EXISTS changelog_dead")
            .execute(self.connection.lock().connection())?;
        self.drop_helper_indexes()
    }

    /// Run `work` with the session's `lock_timeout` set to `timeout`, resetting
    /// it on every exit path so the pooled connection goes back clean. `SET
    /// LOCAL` is no use here: `CONCURRENTLY` cannot run inside a transaction.
    /// A lock timeout in `work` maps to `None`.
    fn with_lock_timeout<T>(
        &self,
        timeout: &str,
        work: impl FnOnce(&StorageConnection) -> Result<T, RepositoryError>,
    ) -> Result<Option<T>, RepositoryError> {
        diesel::sql_query(format!("SET lock_timeout = '{timeout}'"))
            .execute(self.connection.lock().connection())?;
        let result = work(self.connection);
        let reset =
            diesel::sql_query("RESET lock_timeout").execute(self.connection.lock().connection());
        match result {
            Ok(value) => {
                reset?;
                Ok(Some(value))
            }
            Err(error) if is_lock_timeout(&error) => {
                reset?;
                Ok(None)
            }
            // A broken connection fails the reset too; report the cause.
            Err(error) => Err(error),
        }
    }
}

/// Every helper index (`index_changelog_dedup_changelog_p_<lower>`), valid or
/// not, by name.
fn helper_index_names(connection: &StorageConnection) -> Result<Vec<String>, RepositoryError> {
    #[derive(QueryableByName)]
    struct Index {
        #[diesel(sql_type = Text)]
        name: String,
    }
    let names = diesel::sql_query(
        "SELECT relname AS name FROM pg_class \
         WHERE relkind = 'i' AND relname ~ '^index_changelog_dedup_changelog_p_[0-9]+$' \
         ORDER BY relname",
    )
    .get_results::<Index>(connection.lock().connection())?;
    Ok(names.into_iter().map(|i| i.name).collect())
}

/// Whether a relation (table or index) currently exists. Takes no lock.
fn relation_exists(connection: &StorageConnection, name: &str) -> Result<bool, RepositoryError> {
    #[derive(QueryableByName)]
    struct Exists {
        #[diesel(sql_type = diesel::sql_types::Bool)]
        present: bool,
    }
    let result = diesel::sql_query(format!(
        "SELECT to_regclass('{name}') IS NOT NULL AS present"
    ))
    .get_result::<Exists>(connection.lock().connection())?;
    Ok(result.present)
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use super::{
        super::test_helpers::{
            Bigint, hold_open_transaction, partition_holding, reset_partition_layout,
            run_with_timeout,
        },
        DedupRun, DedupStage, LEGACY_INDEX, relation_exists,
    };
    use crate::{
        ChangelogRepository, KeyType, KeyValueStoreRepository, StorageConnection,
        mock::MockDataInserts, test_db,
    };
    use diesel::{prelude::*, sql_types::Text};
    use std::{
        thread,
        time::{Duration, Instant},
    };

    /// Insert rows with explicit cursors (table is always `invoice`) and align
    /// the sequence with the highest one.
    fn seed(connection: &StorageConnection, rows: &[(i64, &str, &str)]) {
        for (cursor, record_id, action) in rows {
            diesel::sql_query(format!(
                "INSERT INTO changelog (cursor, table_name, record_id, row_action) \
                 VALUES ({cursor}, 'invoice', '{record_id}', '{action}')"
            ))
            .execute(connection.lock().connection())
            .unwrap();
        }
        let max = rows.iter().map(|(cursor, ..)| *cursor).max().unwrap();
        diesel::sql_query(format!("SELECT setval('changelog_cursor_seq', {max})"))
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// rec_a: 3 upserts (only @3 survives). rec_b: single. rec_d: upsert@5 +
    /// delete@6 (both survive).
    const SIX_ROWS: [(i64, &str, &str); 6] = [
        (1, "rec_a", "UPSERT"),
        (2, "rec_a", "UPSERT"),
        (3, "rec_a", "UPSERT"),
        (4, "rec_b", "UPSERT"),
        (5, "rec_d", "UPSERT"),
        (6, "rec_d", "DELETE"),
    ];

    /// All changelog cursors that remain, ascending.
    fn surviving_cursors(connection: &StorageConnection) -> Vec<i64> {
        diesel::sql_query("SELECT cursor AS value FROM changelog ORDER BY cursor")
            .get_results::<Bigint>(connection.lock().connection())
            .unwrap()
            .into_iter()
            .map(|c| c.value)
            .collect()
    }

    /// Every index named `index_changelog_dedup*` with whether it is valid, by
    /// name. Includes the INVALID leftover of an interrupted concurrent build.
    fn dedup_indexes(connection: &StorageConnection) -> Vec<(String, bool)> {
        #[derive(QueryableByName)]
        struct Index {
            #[diesel(sql_type = Text)]
            name: String,
            #[diesel(sql_type = diesel::sql_types::Bool)]
            valid: bool,
        }
        diesel::sql_query(
            "SELECT c.relname AS name, x.indisvalid AS valid \
             FROM pg_class c JOIN pg_index x ON x.indexrelid = c.oid \
             WHERE c.relname LIKE 'index\\_changelog\\_dedup%' ORDER BY c.relname",
        )
        .get_results::<Index>(connection.lock().connection())
        .unwrap()
        .into_iter()
        .map(|i| (i.name, i.valid))
        .collect()
    }

    fn marker(connection: &StorageConnection) -> Option<i64> {
        KeyValueStoreRepository::new(connection)
            .get_i64(KeyType::ChangelogDedupCursor)
            .unwrap()
    }

    fn dedup(connection: &StorageConnection) -> DedupRun {
        // Batch size 2 to exercise the batch loop.
        ChangelogRepository::new(connection).dedup(2).unwrap()
    }

    /// Two runs over rows spread across two partitions. Verifies:
    /// - within a window, only the newest row per (table_name, record_id,
    ///   row_action) survives;
    /// - UPSERT and DELETE for the same record survive separately;
    /// - the second run dedups the new window AND removes the old-part leftover
    ///   of a record that reappears, which lives in a partition the window
    ///   does not cover;
    /// - the marker advances to the window's max after each run;
    /// - no helper index and no dead-set table is left behind.
    #[actix_rt::test]
    async fn dedup_windowed_across_partitions() {
        let (_, connection, _, _) =
            test_db::setup_all("dedup_windowed_across_partitions", MockDataInserts::none()).await;

        reset_partition_layout(&connection, &[(1, 5), (5, 9)]);
        seed(&connection, &SIX_ROWS);
        assert_eq!(partition_holding(&connection, "rec_b"), "changelog_p_1");
        assert_eq!(partition_holding(&connection, "rec_d"), "changelog_p_5");

        // Run 1: window (0, 6].
        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            },
            "run 1 should delete rec_a @1,@2"
        );
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6]);
        assert_eq!(marker(&connection), Some(6));

        // rec_a reappears at @7 — its old survivor @3 is now stranded below the
        // marker, in changelog_p_1 which the next window does not cover.
        seed(&connection, &[(7, "rec_a", "UPSERT")]);

        // Run 2: window (6, 7]. Step 1 keeps @7; step 2 removes the old rec_a @3.
        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 1,
                indexes_left: false
            },
            "run 2 should delete the stranded rec_a @3"
        );
        assert_eq!(surviving_cursors(&connection), vec![4, 5, 6, 7]);
        assert_eq!(marker(&connection), Some(7));

        assert!(
            !relation_exists(&connection, "changelog_dead").unwrap(),
            "changelog_dead should be dropped"
        );
        assert_eq!(dedup_indexes(&connection), vec![]);
    }

    /// The helper index goes on the range partitions the window overlaps and
    /// nowhere else: not on partitions wholly below the marker, not on ones
    /// above the max, never on the DEFAULT.
    #[actix_rt::test]
    async fn helper_indexes_built_only_on_windowed_partitions() {
        let (_, connection, _, _) = test_db::setup_all(
            "helper_indexes_built_only_on_windowed_partitions",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 5), (5, 9), (9, 13)]);
        seed(&connection, &SIX_ROWS);
        let repo = ChangelogRepository::new(&connection);

        // (4, 6]: cursors 5 and 6, both in changelog_p_5.
        assert_eq!(repo.prepare_dead_set(4, 6).unwrap(), Some(()));
        assert_eq!(
            dedup_indexes(&connection),
            vec![("index_changelog_dedup_changelog_p_5".to_string(), true)]
        );
        assert_eq!(repo.finish_dead_set().unwrap(), Some(()));
        assert_eq!(dedup_indexes(&connection), vec![]);

        // (3, 6]: cursor 4 is in changelog_p_1, so both lower partitions.
        assert_eq!(repo.prepare_dead_set(3, 6).unwrap(), Some(()));
        assert_eq!(
            dedup_indexes(&connection),
            vec![
                ("index_changelog_dedup_changelog_p_1".to_string(), true),
                ("index_changelog_dedup_changelog_p_5".to_string(), true),
            ]
        );
        assert_eq!(repo.finish_dead_set().unwrap(), Some(()));
        assert_eq!(dedup_indexes(&connection), vec![]);
    }

    /// Another session holds an open transaction that has inserted into the
    /// partition the window covers (ROW EXCLUSIVE, as a long sync integration
    /// does). The concurrent build waits for it, so the run must give up at the
    /// lock timeout rather than wait for the integration — and while it waits,
    /// a third session's insert must not queue behind it. With the whole-table
    /// index this test hangs: the build needs ACCESS EXCLUSIVE, waits on the
    /// open transaction, and the third insert waits behind the build.
    ///
    /// The timed-out build leaves an INVALID index, which the run after the
    /// integration commits drops before completing the window.
    #[actix_rt::test]
    async fn dedup_not_blocked_by_open_insert_transaction() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "dedup_not_blocked_by_open_insert_transaction",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 9)]);
        seed(&connection, &SIX_ROWS[..4]);

        // Session A: open transaction holding ROW EXCLUSIVE on changelog_p_1.
        let holder = hold_open_transaction(
            &connection_manager,
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('invoice', 'held-open', 'UPSERT')",
        );

        // Session B: the dedup, over (0, 4]. Its build on changelog_p_1 waits on A.
        let dedup_connection = connection_manager.connection().unwrap();
        let started = Instant::now();
        let run = thread::spawn(move || dedup(&dedup_connection));
        // Let B's build reach its wait before C starts.
        thread::sleep(Duration::from_millis(500));

        // Session C: an ordinary insert while B waits on A. Must not wait.
        let insert_connection = connection_manager.connection().unwrap();
        let waited = run_with_timeout(move || {
            let started = Instant::now();
            diesel::sql_query(
                "INSERT INTO changelog (table_name, record_id, row_action) \
                 VALUES ('invoice', 'concurrent', 'UPSERT')",
            )
            .execute(insert_connection.lock().connection())
            .unwrap();
            started.elapsed()
        });
        assert!(
            waited < Duration::from_secs(1),
            "insert waited {waited:?} behind the dedup"
        );

        // B gives up at the 5 s lock timeout, well before A commits.
        assert_eq!(
            run.join().unwrap(),
            DedupRun::LockedOut(DedupStage::HelperIndexes)
        );
        let waited = started.elapsed();
        assert!(
            waited < Duration::from_secs(10),
            "dedup waited {waited:?}; lock_timeout did not fire"
        );
        assert_eq!(marker(&connection), None);
        assert_eq!(surviving_cursors(&connection), vec![1, 2, 3, 4, 6]);
        assert_eq!(
            dedup_indexes(&connection),
            vec![("index_changelog_dedup_changelog_p_1".to_string(), false)],
            "the interrupted build leaves an INVALID index"
        );

        holder.release();

        // (0, 6]: A's @5 and C's @6 are single rows; rec_a @1,@2 go.
        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            }
        );
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6]);
        assert_eq!(marker(&connection), Some(6));
        assert_eq!(dedup_indexes(&connection), vec![]);
    }

    /// Something holds a lock on the windowed partition that conflicts with the
    /// concurrent build's own lock (SHARE UPDATE EXCLUSIVE — what VACUUM holds).
    /// The build times out acquiring it, before it has registered an index, so
    /// nothing is left behind. The next run after release completes the window.
    #[actix_rt::test]
    async fn dedup_locked_out_acquiring_lock_then_completes() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "dedup_locked_out_acquiring_lock_then_completes",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 9)]);
        seed(&connection, &SIX_ROWS);

        let holder = hold_open_transaction(
            &connection_manager,
            "LOCK TABLE changelog_p_1 IN SHARE UPDATE EXCLUSIVE MODE",
        );

        let started = Instant::now();
        assert_eq!(
            dedup(&connection),
            DedupRun::LockedOut(DedupStage::HelperIndexes)
        );
        let waited = started.elapsed();
        assert!(
            waited < Duration::from_secs(10),
            "dedup waited {waited:?}; lock_timeout did not fire"
        );
        assert_eq!(marker(&connection), None);
        assert_eq!(surviving_cursors(&connection), vec![1, 2, 3, 4, 5, 6]);
        assert_eq!(dedup_indexes(&connection), vec![]);

        holder.release();

        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            }
        );
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6]);
        assert_eq!(marker(&connection), Some(6));
        assert_eq!(dedup_indexes(&connection), vec![]);
    }

    /// A lock taken after the helper indexes are built makes their drop time
    /// out. The deletes are done, so the run completes and the marker advances;
    /// the indexes stay until the next run, which drops them first.
    #[actix_rt::test]
    async fn dedup_leaves_helper_indexes_for_next_run_when_drop_times_out() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "dedup_leaves_helper_indexes_when_drop_times_out",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 9)]);
        seed(&connection, &SIX_ROWS);
        let repo = ChangelogRepository::new(&connection);

        assert_eq!(repo.prepare_dead_set(0, 6).unwrap(), Some(()));
        let holder = hold_open_transaction(
            &connection_manager,
            "LOCK TABLE changelog_p_1 IN SHARE UPDATE EXCLUSIVE MODE",
        );
        assert_eq!(repo.finish_dead_set().unwrap(), None);
        // The drop timed out acquiring its lock, before it marked the index INVALID.
        assert_eq!(
            dedup_indexes(&connection),
            vec![("index_changelog_dedup_changelog_p_1".to_string(), true)]
        );
        holder.release();

        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            }
        );
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6]);
        assert_eq!(dedup_indexes(&connection), vec![]);
    }

    /// A server stopped mid-run on 3.4.0 keeps the whole-table
    /// `index_changelog_dedup` (a partitioned index with a leg on every
    /// partition). A run drops it before anything else.
    #[actix_rt::test]
    async fn dedup_drops_legacy_whole_table_index() {
        let (_, connection, _, _) = test_db::setup_all(
            "dedup_drops_legacy_whole_table_index",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 5), (5, 9)]);
        seed(&connection, &SIX_ROWS);
        diesel::sql_query(format!(
            "CREATE INDEX {LEGACY_INDEX} ON changelog (table_name, record_id, row_action, cursor DESC)"
        ))
        .execute(connection.lock().connection())
        .unwrap();
        assert!(relation_exists(&connection, LEGACY_INDEX).unwrap());

        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            }
        );
        assert!(!relation_exists(&connection, LEGACY_INDEX).unwrap());
        assert_eq!(dedup_indexes(&connection), vec![]);
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6]);
    }

    /// Dropping the legacy index needs ACCESS EXCLUSIVE on `changelog`, which an
    /// open insert transaction blocks. The run must give up at the short lock
    /// timeout with nothing changed, and the run after the transaction commits
    /// drops the index and completes.
    #[actix_rt::test]
    async fn dedup_locked_out_dropping_legacy_index_then_completes() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "dedup_locked_out_dropping_legacy_index",
            MockDataInserts::none(),
        )
        .await;

        reset_partition_layout(&connection, &[(1, 9)]);
        seed(&connection, &SIX_ROWS);
        diesel::sql_query(format!(
            "CREATE INDEX {LEGACY_INDEX} ON changelog (table_name, record_id, row_action, cursor DESC)"
        ))
        .execute(connection.lock().connection())
        .unwrap();

        let holder = hold_open_transaction(
            &connection_manager,
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('invoice', 'held-open', 'UPSERT')",
        );

        let started = Instant::now();
        assert_eq!(
            dedup(&connection),
            DedupRun::LockedOut(DedupStage::LegacyIndex)
        );
        let waited = started.elapsed();
        // Bounded by the 500 ms lock timeout, not by the holder.
        assert!(
            waited < Duration::from_secs(5),
            "dedup waited {waited:?}; lock_timeout did not fire"
        );
        assert!(relation_exists(&connection, LEGACY_INDEX).unwrap());
        assert_eq!(marker(&connection), None);
        assert_eq!(surviving_cursors(&connection), vec![1, 2, 3, 4, 5, 6]);

        holder.release();

        // (0, 7]: the committed @7 is a single row.
        assert_eq!(
            dedup(&connection),
            DedupRun::Completed {
                removed: 2,
                indexes_left: false
            }
        );
        assert!(!relation_exists(&connection, LEGACY_INDEX).unwrap());
        assert_eq!(dedup_indexes(&connection), vec![]);
        assert_eq!(surviving_cursors(&connection), vec![3, 4, 5, 6, 7]);
        assert_eq!(marker(&connection), Some(7));
    }
}
