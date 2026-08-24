use crate::service_provider::ServiceProvider;
use actix_web::web::Data;
use repository::{RepositoryError, StorageConnection};
use std::cell::Cell;
use std::sync::RwLock;

use std::sync::Arc;

use super::utils::ExecuteGraphql;

pub struct BoaJsContext {
    pub service_provider: Data<ServiceProvider>,
    pub graphql: Arc<dyn ExecuteGraphql>,
}

impl BoaJsContext {
    pub fn new(service_provider: &Data<ServiceProvider>, graphql: impl ExecuteGraphql) -> Self {
        Self {
            service_provider: service_provider.clone(),
            graphql: Arc::new(graphql),
        }
    }
}

// Needs to be bound on startup
static BOAJS_CONTEXT: RwLock<Option<BoaJsContext>> = RwLock::new(None);

impl BoaJsContext {
    pub fn bind(self) {
        *(BOAJS_CONTEXT
            .write()
            .expect("Failed to get write lock for boajs context")) = Some(self);
    }

    pub fn service_provider() -> Data<ServiceProvider> {
        BOAJS_CONTEXT
            .read()
            .expect("Failed to get read lock for boajs context")
            .as_ref()
            .expect("Global boajs context is not present")
            .service_provider
            .clone()
    }

    pub fn execute_graphql() -> Arc<dyn ExecuteGraphql> {
        BOAJS_CONTEXT
            .read()
            .expect("Failed to get read lock for boajs context")
            .as_ref()
            .expect("Global boajs context is not present")
            .graphql
            .clone()
    }
}

thread_local! {
    // Plugins execute synchronously on the calling thread (see call_method), so a caller that
    // already holds a pool connection can lend it to the plugin's `sql()`/`use_repository()`
    // bindings for the duration of the call. Without this, a plugin invocation checks out a
    // second pool connection while the caller's one is pinned — under concurrent item-stats
    // load that double-hold exhausts the pool (issue #12689).
    static SHARED_CONNECTION: Cell<*const StorageConnection> = const { Cell::new(std::ptr::null()) };
}

/// Makes `connection` available to any boajs plugin methods invoked (on this thread) inside `f`,
/// so they reuse it instead of checking out additional pool connections.
pub fn with_shared_connection<R>(connection: &StorageConnection, f: impl FnOnce() -> R) -> R {
    struct ResetGuard(*const StorageConnection);
    impl Drop for ResetGuard {
        fn drop(&mut self) {
            SHARED_CONNECTION.with(|cell| cell.set(self.0));
        }
    }

    let previous = SHARED_CONNECTION.with(|cell| cell.replace(connection as *const _));
    // Restores the previous value even on unwind, so the pointer can never outlive `connection`.
    let _guard = ResetGuard(previous);
    f()
}

/// Runs `f` with the connection lent by an enclosing `with_shared_connection`, or with a fresh
/// pool connection when there is none. For use by boajs method bindings only.
pub(crate) fn use_boajs_connection<R>(
    f: impl FnOnce(&StorageConnection) -> R,
) -> Result<R, RepositoryError> {
    SHARED_CONNECTION.with(|cell| {
        let ptr = cell.get();
        if ptr.is_null() {
            let connection = BoaJsContext::service_provider().connection()?;
            Ok(f(&connection))
        } else {
            // SAFETY: `ptr` is only ever set by `with_shared_connection`, whose guard clears it
            // before the borrowed connection goes out of scope, and it is thread-local — so a
            // non-null pointer here always refers to a live connection owned further up this
            // thread's stack.
            Ok(f(unsafe { &*ptr }))
        }
    })
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{mock::MockDataInserts, test_db};

    #[actix_rt::test]
    async fn shared_connection_is_lent_and_restored() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "shared_connection_is_lent_and_restored",
            MockDataInserts::none(),
        )
        .await;

        let connection_a = connection_manager.connection().unwrap();
        let connection_b = connection_manager.connection().unwrap();
        let ptr_a = &connection_a as *const StorageConnection;
        let ptr_b = &connection_b as *const StorageConnection;

        let seen = |expected: *const StorageConnection| {
            let seen = use_boajs_connection(|c| c as *const StorageConnection).unwrap();
            assert_eq!(seen, expected);
        };

        with_shared_connection(&connection_a, || {
            seen(ptr_a);
            // A nested lend wins while in scope, and the outer one is restored on exit
            with_shared_connection(&connection_b, || seen(ptr_b));
            seen(ptr_a);
        });
    }
}
