//! Changelog deduplication (postgres-only, driven by the scheduled dedup task).
//!
//! The changelog is append-only, so a record accumulates one row per change.
//! Dedup keeps only the newest row per (table_name, record_id, row_action) group
//! and deletes the rest.
//! 
//! These helpers MUST be called outside a `transaction_sync` (each statement
//! autocommits): the per-batch deletes commit independently so the task can check
//! the clock between batches.

use crate::{ChangelogRepository, RepositoryError};
use diesel::{
    prelude::*,
    sql_types::{BigInt, Integer},
};
use std::time::Instant;


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

        // Index to support the window's row_number() and the step-2 join.
        let t = Instant::now();
        diesel::sql_query(
            "CREATE INDEX IF NOT EXISTS index_changelog_dedup \
             ON changelog (table_name, record_id, row_action, cursor DESC)",
        )
        .execute(self.connection.lock().connection())?;
        log::info!(
            "changelog dedup: built index_changelog_dedup in {:?}",
            t.elapsed()
        );

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
        log::info!("changelog dedup: step 1 (build dead-set) in {:?}", t.elapsed());

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
    /// `changelog_dead`), logging the batch to `changelog_dead_log`. Each call
    /// autocommits. Returns the number of changelog rows deleted; 0 means the
    /// dead-set is drained.
    pub fn delete_dead_batch(
        &self,
        batch_size: i64,
        running_total: i64,
    ) -> Result<u64, RepositoryError> {
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
        diesel::sql_query(
            "DELETE FROM changelog_dead \
             WHERE cursor IN (SELECT cursor FROM changelog_dead ORDER BY cursor LIMIT $1)",
        )
        .bind::<BigInt, _>(batch_size)
        .execute(self.connection.lock().connection())?;

        // Per-batch progress is persisted to changelog_dead_log (with a timestamp)
        diesel::sql_query(
            "INSERT INTO changelog_dead_log (deleted_batch, deleted_total) VALUES ($1, $2)",
        )
        .bind::<Integer, _>(n as i32)
        .bind::<BigInt, _>(running_total + n)
        .execute(self.connection.lock().connection())?;

        Ok(n as u64)
    }

    /// Drop the dead-set table and the dedup index. Called on both success and
    /// time-window cutoff (and idempotent via IF EXISTS for crash recovery).
    pub fn finish_dead_set(&self) -> Result<(), RepositoryError> {
        if !cfg!(feature = "postgres") {
            return Ok(());
        }
        diesel::sql_query("DROP TABLE IF EXISTS changelog_dead")
            .execute(self.connection.lock().connection())?;
        diesel::sql_query("DROP INDEX IF EXISTS index_changelog_dedup")
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
