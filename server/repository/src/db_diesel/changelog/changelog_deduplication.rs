//! Changelog deduplication (postgres-only, driven by the scheduled dedup task).
//!
//! The changelog is append-only, so a record accumulates one row per change.
//! Dedup keeps only the newest row per (table_name, record_id, row_action) group
//! and deletes the rest.
//!
//! Every statement that can wait on a lock runs under a `lock_timeout`; a
//! timeout comes back as an error for the caller to retry.
//!
//! These helpers MUST be called outside a `transaction_sync` (each statement
//! autocommits): Postgres refuses `CONCURRENTLY` inside a transaction, and the
//! per-batch deletes commit independently.

use super::partition::{is_lock_timeout, range_partitions};
use crate::{ChangelogRepository, RepositoryError, StorageConnection};
use diesel::{
    prelude::*,
    sql_types::{BigInt, Text},
};
use std::time::Instant;

/// Waiting on a concurrent build or drop blocks nobody.
const CONCURRENT_LOCK_TIMEOUT: &str = "5s";

impl<'a> ChangelogRepository<'a> {
    /// Build `changelog_dead` — the set of cursors to delete — for the window
    /// `(marker, max]`. Step 1: within the window, keep each record's newest row and
    /// mark its older rows for deletion. Step 2: for any record in the window that
    /// also has rows at/below the marker (kept by a previous run), mark those for
    /// deletion too.
    pub fn prepare_dead_set(&self, marker: i64, max: i64) -> Result<(), RepositoryError> {
        if !cfg!(feature = "postgres") {
            return Ok(());
        }
        log::info!("changelog dedup: prepare_dead_set window ({marker}, {max}]");

        // One `CREATE INDEX CONCURRENTLY` per range partition overlapping the
        // window; never the DEFAULT partition, which the partition top-up locks.
        // `IF NOT EXISTS` reuses an index a previous run left behind, and skips
        // an INVALID one from an interrupted build (that partition is scanned
        // this run).
        self.with_lock_timeout(CONCURRENT_LOCK_TIMEOUT, |connection| {
            for partition in range_partitions(connection)?
                .into_iter()
                // Partition holds `lower..upper`; the window holds `marker + 1..=max`.
                .filter(|p| p.lower <= max && p.upper > marker + 1)
            {
                diesel::sql_query(format!(
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS index_changelog_dedup_{0} ON {0} \
                     (table_name, record_id, row_action, cursor DESC)",
                    partition.name
                ))
                .execute(connection.lock().connection())?;
            }
            Ok(())
        })?;

        // Fresh dead-set table each run (drop any leftover from an aborted run).
        diesel::sql_query("DROP TABLE IF EXISTS changelog_dead")
            .execute(self.connection.lock().connection())?;

        // Step 1: within the window, every row that is not the newest of its group.
        let t = Instant::now();
        diesel::sql_query(
            "CREATE TABLE changelog_dead AS \
             SELECT cursor FROM ( \
                 SELECT cursor, row_number() OVER ( \
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
        let t = Instant::now();
        diesel::sql_query(
            "INSERT INTO changelog_dead \
             SELECT old.cursor FROM changelog old \
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

        Ok(())
    }

    /// Delete one batch of dead cursors from `changelog` (and pop them from
    /// `changelog_dead`). Each call autocommits. Returns the number of changelog
    /// rows deleted; 0 means the dead-set is drained.
    pub fn delete_dead_batch(&self, batch_size: i64) -> Result<u64, RepositoryError> {
        if !cfg!(feature = "postgres") {
            return Ok(0);
        }
        // Delete the next `batch_size` dead cursors from changelog. Index-driven via
        // changelog_pkey; the affected-row count is this batch's size.
        let n = diesel::sql_query(
            "DELETE FROM changelog \
             WHERE cursor IN (SELECT cursor FROM changelog_dead ORDER BY cursor LIMIT $1)",
        )
        .bind::<BigInt, _>(batch_size)
        .execute(self.connection.lock().connection())? as i64;

        // Pop the same cursors from the dead-set (index-driven via index_changelog_dead_cursor).
        // A crash between the two deletes self-heals because `prepare_dead_set` rebuilds
        // `changelog_dead` from scratch each run.
        diesel::sql_query(
            "DELETE FROM changelog_dead \
             WHERE cursor IN (SELECT cursor FROM changelog_dead ORDER BY cursor LIMIT $1)",
        )
        .bind::<BigInt, _>(batch_size)
        .execute(self.connection.lock().connection())?;

        Ok(n as u64)
    }

    /// Drop the dead-set table, then every helper index (found by name, so an
    /// interrupted run's leftovers go too) with one `DROP INDEX CONCURRENTLY`
    /// each. A lock timeout leaves the rest for the next run.
    pub fn finish_dead_set(&self) -> Result<(), RepositoryError> {
        if !cfg!(feature = "postgres") {
            return Ok(());
        }
        diesel::sql_query("DROP TABLE IF EXISTS changelog_dead")
            .execute(self.connection.lock().connection())?;
        let dropped = self.with_lock_timeout(CONCURRENT_LOCK_TIMEOUT, |connection| {
            #[derive(QueryableByName)]
            struct Index {
                #[diesel(sql_type = Text)]
                name: String,
            }
            // Every helper index, valid or not.
            let indexes = diesel::sql_query(
                "SELECT relname AS name FROM pg_class \
                 WHERE relkind = 'i' AND relname ~ '^index_changelog_dedup_changelog_p_[0-9]+$'",
            )
            .get_results::<Index>(connection.lock().connection())?;
            for index in indexes {
                diesel::sql_query(format!("DROP INDEX CONCURRENTLY IF EXISTS {}", index.name))
                    .execute(connection.lock().connection())?;
            }
            Ok(())
        });
        match dropped {
            Err(error) if !is_lock_timeout(&error) => Err(error),
            _ => Ok(()),
        }
    }

    /// Run `work` with the session's `lock_timeout` set, resetting it on every
    /// exit path so the pooled connection goes back clean (`SET LOCAL` needs a
    /// transaction, which `CONCURRENTLY` refuses).
    fn with_lock_timeout<T>(
        &self,
        timeout: &str,
        work: impl FnOnce(&StorageConnection) -> Result<T, RepositoryError>,
    ) -> Result<T, RepositoryError> {
        diesel::sql_query(format!("SET lock_timeout = '{timeout}'"))
            .execute(self.connection.lock().connection())?;
        let result = work(self.connection);
        let reset =
            diesel::sql_query("RESET lock_timeout").execute(self.connection.lock().connection());
        let value = result?;
        reset?;
        Ok(value)
    }
}
