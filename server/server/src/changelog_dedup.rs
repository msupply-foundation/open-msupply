use chrono::Local;
use service::{
    service_provider::ServiceProvider, settings::ChangelogDedupSettings, sync::CentralServerConfig,
};
use std::sync::Arc;
use tokio::task::JoinHandle;

/// Spawn the scheduled changelog deduplication task.
///
/// The changelog operations are append-only, so each record accumulates one row per change.
/// This task periodically deletes the stale older rows, keeping only the newest
/// row per `(table_name, record_id, row_action)` group. It is:
///
/// - **Central-only**: dedup runs only on the central server. Checked per-tick
///   (not at spawn) because central-ness can flip at runtime after sync init.
/// - **Postgres-only**: `run_dedup` is a no-op under SQLite (remotes have small,
///   unpartitioned changelogs and don't need it).
/// - **Time-window-gated**: if a `time_window` is configured, a run only starts
///   while the local clock is within it, and stops between batches once `to` passes.
pub fn spawn(
    service_provider: Arc<ServiceProvider>,
    settings: ChangelogDedupSettings,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        if !CentralServerConfig::is_central_server() {
            return;
        }

        let mut interval = tokio::time::interval(settings.interval.as_duration());
        loop {
            interval.tick().await;

            // Only start a run inside the configured window (if any).
            if let Some(window) = &settings.time_window {
                if !window.contains(Local::now().time()) {
                    continue;
                }
            }

            let Ok(ctx) = service_provider.basic_context() else {
                log::error!("changelog dedup task: failed to get context");
                continue;
            };

            // Diesel calls are blocking; run on a blocking worker so we don't
            // stall the async runtime.
            let settings = settings.clone();
            let result = tokio::task::spawn_blocking(move || run_dedup(&ctx, &settings)).await;

            match result {
                Ok(Ok(removed)) => {
                    if removed > 0 {
                        log::info!("changelog dedup task removed {removed} duplicate row(s)")
                    }
                }
                Ok(Err(e)) => log::error!("changelog dedup task: {e:?}"),
                Err(e) => log::error!("changelog dedup task: join error: {e:?}"),
            }
        }
    })
}

/// Run one dedup pass over the window `(marker, max]`, deleting in committed
/// batches. Advances the `ChangelogDedupCursor` marker only if the run completes
/// before the time window's `to` cutoff. Returns the number of rows deleted.
fn run_dedup(
    ctx: &service::service_provider::ServiceContext,
    settings: &ChangelogDedupSettings,
) -> Result<u64, repository::RepositoryError> {
    use repository::{ChangelogRepository, KeyType, KeyValueStoreRepository};

    let connection = &ctx.connection;
    let repo = ChangelogRepository::new(connection);
    let kv = KeyValueStoreRepository::new(connection);

    // Marker: highest cursor already fully deduped. `i64` to match cursor type.
    let marker = kv.get_i64(KeyType::ChangelogDedupCursor)?.unwrap_or(0);
    // Safe upper bound — never windows past an in-flight changelog transaction.
    let max = repo.max_cursor()? as i64;
    if max <= marker {
        return Ok(0);
    }

    repo.prepare_dead_set(marker, max)?;

    let batch_size = settings.batch_size();
    let mut total: u64 = 0;
    let completed = loop {
        // Stop cleanly between batches once the window's `to` time has passed.
        // Committed batches stay (they only deleted true duplicates); the marker
        // is not advanced, so the next eligible run re-does this window.
        if let Some(window) = &settings.time_window {
            if !window.contains(Local::now().time()) {
                log::info!(
                    "changelog dedup task: time window passed, stopping after {total} row(s)"
                );
                break false;
            }
        }

        let n = repo.delete_dead_batch(batch_size, total as i64)?;
        total += n;
        if n == 0 {
            break true;
        }
    };

    repo.finish_dead_set()?;

    // Only advance the marker on a complete run.
    if completed {
        kv.set_i64(KeyType::ChangelogDedupCursor, Some(max))?;
    }

    Ok(total)
}
