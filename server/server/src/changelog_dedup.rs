use chrono::Local;
use repository::{ChangelogRepository, DedupRun, DedupStage};
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
/// - **Postgres-only**: `ChangelogRepository::dedup` is a no-op under SQLite
///   (remotes have small, unpartitioned changelogs and don't need it).
/// - **Time-window-gated**: if a `time_window` is configured, a run only starts
///   while the local clock is within it.
/// - **Never blocking**: its index DDL runs concurrently and under a lock
///   timeout. A run that times out (`LockedOut`) is retried next tick.
pub fn spawn(
    service_provider: Arc<ServiceProvider>,
    settings: ChangelogDedupSettings,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(settings.interval.as_duration());
        loop {
            interval.tick().await;

            if !CentralServerConfig::is_central_server() {
                continue;
            }

            // Only start a run inside the configured window (if any). Bad `HH:MM`
            // config is rejected at yaml deserialize time, so the window is valid here.
            if let Some(window) = &settings.time_window
                && !window.contains(Local::now().time())
            {
                continue;
            }

            let Ok(ctx) = service_provider.basic_context() else {
                log::error!("changelog dedup task: failed to get context");
                continue;
            };

            // Diesel calls are blocking; run on a blocking worker so we don't
            // stall the async runtime.
            let batch_size = settings.batch_size();
            let result = tokio::task::spawn_blocking(move || {
                ChangelogRepository::new(&ctx.connection).dedup(batch_size)
            })
            .await;

            match result {
                Ok(Ok(DedupRun::Completed {
                    removed,
                    indexes_left,
                })) => {
                    if removed > 0 {
                        log::info!("changelog dedup task removed {removed} duplicate row(s)")
                    }
                    if indexes_left {
                        log::warn!(
                            "changelog dedup task: lock timeout while dropping the helper \
                             indexes; the next run drops them"
                        )
                    }
                }
                Ok(Ok(DedupRun::LockedOut(stage))) => {
                    let stage = match stage {
                        DedupStage::LegacyIndex => "dropping index_changelog_dedup",
                        DedupStage::HelperIndexes => "building the helper indexes",
                    };
                    log::warn!(
                        "changelog dedup task: lock timeout while {stage}; will retry next tick"
                    )
                }
                Ok(Err(e)) => log::error!("changelog dedup task: {e:?}"),
                Err(e) => log::error!("changelog dedup task: join error: {e:?}"),
            }
        }
    })
}
