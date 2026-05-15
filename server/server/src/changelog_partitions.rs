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
            match service_provider.basic_context() {
                // `ensure_partition_lookahead` is a no-op under SQLite (no partitions
                // to top up); under Postgres it adds partitions when headroom is low.
                Ok(ctx) => {
                    if let Err(e) =
                        repository::ensure_partition_lookahead(&ctx.connection, &partition_config)
                    {
                        log::error!("changelog partition top-up: {e:?}");
                    }
                }
                Err(e) => log::error!("changelog partition top-up: failed to get context: {e:?}"),
            }
        }
    })
}
