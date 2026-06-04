use service::{service_provider::ServiceProvider, settings::ChangelogPartitionSettings};
use std::sync::Arc;
use tokio::task::JoinHandle;

pub fn spawn(
    service_provider: Arc<ServiceProvider>,
    settings: ChangelogPartitionSettings,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(settings.interval.as_duration());
        let partition_config = settings.to_migration_config();
        loop {
            interval.tick().await;
            let Ok(ctx) = service_provider.basic_context() else {
                log::error!("changelog partition task: failed to get context: {e:?}");
                continue;
            };
            // `ensure_partition_lookahead` is a no-op under SQLite (no partitions
            // to top up); under Postgres it adds partitions when headroom is low.
            // Diesel calls are blocking, so run on a blocking worker to avoid
            // stalling the async runtime.

            let partition_config = partition_config.clone();
            let result = tokio::task::spawn_blocking(move || {
                repository::ensure_partition_lookahead(&ctx.connection, &partition_config)
            })
            .await;

            match result {
                Ok(Ok(i)) => {
                    if i > 0 {
                        log::info!("changelog partition task created {i} new partition(s)")
                    }
                }
                Ok(Err(e)) => log::error!("changelog partition task: {e:?}"),
                Err(e) => log::error!("changelog partition task: join error: {e:?}"),
            }
        }
    })
}
