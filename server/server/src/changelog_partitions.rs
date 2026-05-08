use service::{service_provider::ServiceProvider, settings::ChangelogPartitionSettings};
use std::sync::Arc;
use tokio::task::JoinHandle;

pub fn spawn(
    service_provider: Arc<ServiceProvider>,
    settings: ChangelogPartitionSettings,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(settings.interval.as_duration());
        #[cfg(feature = "postgres")]
        let partition_config = settings.to_migration_config();
        loop {
            interval.tick().await;
            match service_provider.basic_context() {
                Ok(_ctx) => {
                    // if postgres - check if we need to create new partitions on the changelog table, and do so if needed
                    #[cfg(feature = "postgres")]
                    {
                        use repository::ensure_partition_lookahead;
                        if let Err(e) =
                            ensure_partition_lookahead(&_ctx.connection, &partition_config)
                        {
                            log::error!("changelog partition top-up: {e:?}");
                        }
                    }
                }
                Err(e) => log::error!("changelog partition top-up: failed to get context: {e:?}"),
            }
        }
    })
}
