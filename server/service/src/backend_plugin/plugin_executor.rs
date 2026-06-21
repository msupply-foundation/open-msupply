use std::sync::OnceLock;

use tokio::runtime::{Builder, Runtime};

use crate::boajs::{clear_engine_cache, BoaJsError};

/// Dedicated runtime for running the synchronous boajs interpreter off the main
/// async runtime (#11949). It is the single place backend plugin engines are
/// built and run: `call_plugin` / `call_plugin_async` dispatch their boajs work
/// here (boundary dispatch), so callers don't need to know about it.
///
/// The per-thread engine cache (the `thread_local` in `boajs::call_method`) lives
/// on this runtime's blocking-pool threads, and the `on_thread_stop` hook clears
/// it while each thread is still alive — so a reaped thread frees its engines
/// cleanly instead of leaking them (#11943). Tokio's demand-scaling is preserved:
/// a single thread under light load, growing/reaping with load.
static PLUGIN_RUNTIME: OnceLock<Runtime> = OnceLock::new();

fn runtime() -> &'static Runtime {
    PLUGIN_RUNTIME.get_or_init(|| {
        Builder::new_multi_thread()
            // We only use the blocking pool; one worker drives the bookkeeping.
            .worker_threads(1)
            .thread_name("plugin-boajs")
            // Free this thread's cached engines while it's still alive (boa's GC
            // thread-locals are intact here); dropping them at TLS teardown would
            // panic. See boajs::clear_engine_cache.
            .on_thread_stop(clear_engine_cache)
            .enable_all()
            .build()
            .expect("Failed to build plugin runtime")
    })
}

/// Run a boajs closure on the plugin runtime and **block** until it completes.
/// For sync callers (already on a blocking thread, e.g. inside a `spawn_blocking`
/// requisition mutation or the item_stats loader).
pub fn run_blocking<T, F>(f: F) -> Result<T, BoaJsError>
where
    F: FnOnce() -> Result<T, BoaJsError> + Send + 'static,
    T: Send + 'static,
{
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    runtime().spawn_blocking(move || {
        // If the receiver is gone (caller dropped) the send fails harmlessly.
        let _ = tx.send(f());
    });
    rx.recv().unwrap_or_else(|_| {
        Err(BoaJsError::TaskJoin(
            "plugin pool task panicked or was dropped".to_string(),
        ))
    })
}

/// Run a boajs closure on the plugin runtime and **await** it. For async callers
/// (processor / schedule), so the boajs interpreter never runs on the runtime
/// worker thread.
pub async fn run_async<T, F>(f: F) -> Result<T, BoaJsError>
where
    F: FnOnce() -> Result<T, BoaJsError> + Send + 'static,
    T: Send + 'static,
{
    match runtime().spawn_blocking(f).await {
        Ok(result) => result,
        Err(join_error) => Err(BoaJsError::TaskJoin(join_error.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::{run_async, run_blocking};
    use crate::boajs::BoaJsError;

    // The boajs work runs on the dedicated runtime's pool, not the caller's
    // thread — that's what keeps engine builds on threads whose teardown we
    // manage (the plugin-boajs threads, cleared via on_thread_stop).
    #[test]
    fn run_blocking_runs_on_the_dedicated_runtime() {
        let caller = std::thread::current().id();
        let (worker_id, worker_name) = run_blocking(|| {
            Ok::<_, BoaJsError>((
                std::thread::current().id(),
                std::thread::current().name().map(str::to_string),
            ))
        })
        .expect("run_blocking should return Ok");

        assert_ne!(worker_id, caller, "must run on a pool thread, not the caller");
        assert_eq!(worker_name.as_deref(), Some("plugin-boajs"));
    }

    // A panicking plugin task surfaces as a TaskJoin error rather than killing
    // the caller or hanging on the channel.
    #[test]
    fn run_blocking_maps_panic_to_task_join_error() {
        let result = run_blocking(|| -> Result<(), BoaJsError> { panic!("boom") });
        assert!(matches!(result, Err(BoaJsError::TaskJoin(_))));
    }

    #[tokio::test]
    async fn run_async_runs_on_the_dedicated_runtime() {
        let caller = std::thread::current().id();
        let (worker_id, worker_name) = run_async(|| {
            Ok::<_, BoaJsError>((
                std::thread::current().id(),
                std::thread::current().name().map(str::to_string),
            ))
        })
        .await
        .expect("run_async should return Ok");

        assert_ne!(worker_id, caller, "must run on a pool thread, not the caller");
        assert_eq!(worker_name.as_deref(), Some("plugin-boajs"));
    }
}
