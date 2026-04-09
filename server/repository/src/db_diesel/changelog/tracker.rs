use std::{
    collections::BTreeSet,
    sync::{Arc, Mutex},
};

/// Process-global tracker of in-flight (uncommitted) changelog cursors.
///
/// When a changelog row is inserted inside a transaction, its cursor is registered
/// here immediately. When the transaction commits or rolls back, the cursors are
/// deregistered. Readers use `max_safe_cursor()` to avoid reading past uncommitted
/// entries.
///
/// This is safe on crash: in-memory state is lost, but all in-flight transactions
/// are rolled back by the database, so an empty tracker on restart is correct.
#[derive(Clone, Default)]
pub struct ChangelogTracker {
    inner: Arc<Mutex<BTreeSet<i64>>>,
}

impl ChangelogTracker {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a cursor as in-flight (called immediately after INSERT in a transaction)
    pub fn register(&self, cursor: i64) {
        self.inner.lock().unwrap().insert(cursor);
    }

    /// Deregister cursors (called after transaction commit or rollback)
    pub fn deregister(&self, cursors: &[i64]) {
        let mut guard = self.inner.lock().unwrap();
        for cursor in cursors {
            guard.remove(cursor);
        }
    }

    /// Returns the max cursor that is safe to read up to.
    /// If there are in-flight cursors, returns `Some(min_in_flight - 1)`.
    /// If there are no in-flight cursors, returns `None` (no limit — read everything).
    pub fn max_safe_cursor(&self) -> Option<i64> {
        let guard = self.inner.lock().unwrap();
        guard.iter().next().map(|min| min - 1)
    }
}

impl std::fmt::Debug for ChangelogTracker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let guard = self.inner.lock().unwrap();
        f.debug_struct("ChangelogTracker")
            .field("in_flight", &*guard)
            .finish()
    }
}

/// Singleton instance. Initialised lazily on first access.
static GLOBAL_TRACKER: std::sync::OnceLock<ChangelogTracker> = std::sync::OnceLock::new();

pub fn global_changelog_tracker() -> &'static ChangelogTracker {
    GLOBAL_TRACKER.get_or_init(ChangelogTracker::new)
}
