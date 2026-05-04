use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use diesel::prelude::*;

use crate::{repository_error::RepositoryError, StorageConnection};

use super::changelog::changelog;

/// Per-`StorageConnectionManager` tracker of in-flight (uncommitted) changelog
/// boundaries. Each `StorageConnection` registers a single entry on its first
/// changelog insert of a transaction: the value is `MAX(cursor) + 1` at the
/// time of that first insert, i.e. a lower bound on the cursors this
/// transaction will produce.
///
/// Readers compute `max_safe_cursor = min(values) - 1` to avoid advancing past
/// any in-flight cursor.
///
/// Crash-safe: on process crash the in-memory map is lost, but the database
/// rolls back all in-flight transactions, so an empty tracker on restart is
/// consistent with the database.
#[derive(Default)]
pub struct ChangelogCursorTracker {
    inner: Mutex<HashMap<String, i64>>,
}

impl ChangelogCursorTracker {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Register the connection's lower-bound tracked cursor for its current
    /// transaction. No-op if the connection's uuid is already present
    /// (idempotent across multiple inserts in the same tx) or if the
    /// connection is in autocommit (no transaction).
    pub fn track(connection: &StorageConnection) -> Result<(), RepositoryError> {
        let tracker = connection.changelog_cursor_tracker();

        if tracker.contains(connection.uuid()) {
            return Ok(());
        }

        let in_transaction = connection
            .lock()
            .transaction_level::<RepositoryError>()
            .map_err(RepositoryError::from)?
            > 0;
        if !in_transaction {
            return Ok(());
        }

        let max_cursor = changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(connection.lock().connection())?
            .unwrap_or(0);

        tracker
            .inner
            .lock()
            .unwrap()
            .insert(connection.uuid().to_string(), max_cursor + 1);

        Ok(())
    }

    /// Returns the maximum cursor that is currently safe to read up to. If any
    /// transaction is mid-flight, returns `Some(min(registered) - 1)`; if not,
    /// returns `None` (no clamp).
    pub fn max_safe_cursor(connection: &StorageConnection) -> Option<i64> {
        let tracker = connection.changelog_cursor_tracker();
        let guard = tracker.inner.lock().unwrap();
        guard.values().min().map(|m| m - 1)
    }

    /// Remove the connection's entry. Called from the outermost
    /// commit/rollback path of `transaction_sync_etc`.
    pub fn untrack(connection: &StorageConnection) {
        let tracker = connection.changelog_cursor_tracker();
        tracker.inner.lock().unwrap().remove(connection.uuid());
    }

    fn contains(&self, uuid: &str) -> bool {
        self.inner.lock().unwrap().contains_key(uuid)
    }
}

impl std::fmt::Debug for ChangelogCursorTracker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let guard = self.inner.lock().unwrap();
        f.debug_struct("ChangelogCursorTracker")
            .field("in_flight", &*guard)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{test_db, TransactionError};

    #[actix_rt::test]
    async fn empty_tracker_returns_none() {
        let settings = test_db::get_test_db_settings("tracker_empty");
        let manager = test_db::setup(&settings).await;
        let connection = manager.connection().unwrap();

        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&connection), None);
    }

    #[actix_rt::test]
    async fn track_outside_transaction_is_noop() {
        let settings = test_db::get_test_db_settings("tracker_autocommit_noop");
        let manager = test_db::setup(&settings).await;
        let connection = manager.connection().unwrap();

        ChangelogCursorTracker::track(&connection).unwrap();
        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&connection), None);
    }

    #[actix_rt::test]
    async fn track_is_idempotent_within_a_transaction() {
        let settings = test_db::get_test_db_settings("tracker_idempotent");
        let manager = test_db::setup(&settings).await;
        let connection = manager.connection().unwrap();

        let _: Result<_, TransactionError<RepositoryError>> =
            connection.transaction_sync(|con| -> Result<(), RepositoryError> {
                ChangelogCursorTracker::track(con)?;
                let first = ChangelogCursorTracker::max_safe_cursor(con);
                ChangelogCursorTracker::track(con)?;
                let second = ChangelogCursorTracker::max_safe_cursor(con);
                assert_eq!(first, second);
                assert!(first.is_some());
                Ok(())
            });
    }

    #[actix_rt::test]
    async fn untrack_after_outermost_commit() {
        let settings = test_db::get_test_db_settings("tracker_untrack_on_commit");
        let manager = test_db::setup(&settings).await;
        let connection = manager.connection().unwrap();

        let _: Result<_, TransactionError<RepositoryError>> =
            connection.transaction_sync(|con| -> Result<(), RepositoryError> {
                ChangelogCursorTracker::track(con)?;
                assert!(ChangelogCursorTracker::max_safe_cursor(con).is_some());
                Ok(())
            });

        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&connection), None);
    }

    #[actix_rt::test]
    async fn untrack_after_outermost_rollback() {
        let settings = test_db::get_test_db_settings("tracker_untrack_on_rollback");
        let manager = test_db::setup(&settings).await;
        let connection = manager.connection().unwrap();

        let _: Result<(), TransactionError<RepositoryError>> =
            connection.transaction_sync(|con| -> Result<(), RepositoryError> {
                ChangelogCursorTracker::track(con)?;
                assert!(ChangelogCursorTracker::max_safe_cursor(con).is_some());
                Err(RepositoryError::NotFound)
            });

        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&connection), None);
    }

    #[actix_rt::test]
    async fn min_of_two_connections() {
        let settings = test_db::get_test_db_settings("tracker_min_of_two");
        let manager = test_db::setup(&settings).await;
        let connection_a = manager.connection().unwrap();
        let connection_b = manager.connection().unwrap();
        let observer = manager.connection().unwrap();

        let _: Result<_, TransactionError<RepositoryError>> =
            connection_a.transaction_sync(|con_a| -> Result<(), RepositoryError> {
                ChangelogCursorTracker::track(con_a)?;
                let _: Result<_, TransactionError<RepositoryError>> =
                    connection_b.transaction_sync(|con_b| -> Result<(), RepositoryError> {
                        ChangelogCursorTracker::track(con_b)?;
                        // Both registered — observer should see a clamp.
                        assert!(ChangelogCursorTracker::max_safe_cursor(&observer).is_some());
                        Ok(())
                    });
                Ok(())
            });

        // Both should be untracked after their outer commits
        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&observer), None);
    }
}
