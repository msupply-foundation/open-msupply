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
///
/// Lending is deliberately skipped when `connection` is already inside a transaction, because
/// sharing it there would pull plugin statements into the caller's transaction:
///
/// - On postgres a failed statement aborts the whole transaction, and `sql()` hands the error to
///   the plugin as a catchable JS error — so a plugin that swallows it would leave the caller's
///   transaction poisoned and failing later for no visible reason.
/// - Plugin writes (`use_repository` upserts) would roll back with the caller instead of
///   persisting independently, and plugin reads would see the caller's uncommitted rows.
///
/// Those paths (requisition create/update, which call `get_item_stats` inside `transaction_sync`)
/// keep the previous isolated behaviour and check out their own connection as before. The pool
/// exhaustion this exists to fix (#12689) is in the graphql dataloader fan-out, which is not
/// transactional.
pub fn with_shared_connection<R>(connection: &StorageConnection, f: impl FnOnce() -> R) -> R {
    // A transaction manager in an error state can't tell us the depth; treat that as "in a
    // transaction" so we never lend a connection whose state we can't reason about.
    let in_transaction = connection
        .lock()
        .transaction_level::<RepositoryError>()
        .map(|level| level > 0)
        .unwrap_or(true);

    if in_transaction {
        return f();
    }

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
    use crate::boajs::utils::{ExecuteGraphQlError, ExecuteGraphql};
    use repository::{mock::MockDataInserts, test_db};

    // `use_boajs_connection`'s fallback path reads the global boajs context to check out a pool
    // connection, and binding that context requires an ExecuteGraphql impl. These tests never
    // call graphql, so a no-op stub is enough.
    struct NoopGraphql;
    #[async_trait::async_trait]
    impl ExecuteGraphql for NoopGraphql {
        async fn execute_graphql(
            &self,
            _: &str,
            _: &str,
            _: serde_json::Value,
        ) -> Result<serde_json::Value, ExecuteGraphQlError> {
            unreachable!("connection lending does not use graphql")
        }
    }

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

    /// A connection that is already in a transaction must not be lent — plugin statements would
    /// otherwise join the caller's transaction. See `with_shared_connection`.
    #[actix_rt::test]
    async fn shared_connection_is_not_lent_inside_a_transaction() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "shared_connection_is_not_lent_inside_a_transaction",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = Data::new(ServiceProvider::new(connection_manager.clone()));
        BoaJsContext::new(&service_provider, NoopGraphql).bind();

        let connection = connection_manager.connection().unwrap();
        let uuid = connection.uuid().to_string();
        let seen_uuid = || use_boajs_connection(|c| c.uuid().to_string()).unwrap();

        // Outside a transaction the connection is lent, as usual
        with_shared_connection(&connection, || assert_eq!(seen_uuid(), uuid));

        // Inside one it isn't: the binding falls back to its own pool connection
        connection
            .transaction_sync(|tx_connection| -> Result<(), RepositoryError> {
                assert_eq!(tx_connection.uuid(), uuid);
                with_shared_connection(tx_connection, || assert_ne!(seen_uuid(), uuid));
                Ok(())
            })
            .unwrap();

        // ... and the lend works again once the transaction has closed
        with_shared_connection(&connection, || assert_eq!(seen_uuid(), uuid));
    }
}
