use repository::{PartitionTopUp, StorageConnection, SystemLogType};
use service::{
    activity_log::{system_log_entry, SystemLogMessage},
    service_provider::ServiceProvider,
    settings::ChangelogPartitionSettings,
};
use std::sync::Arc;
use tokio::task::JoinHandle;

/// Keeps `changelog`'s postgres partitions topped up ahead of the cursor.
///
/// A tick that times out on a lock (`LockedOut`) is retried next tick. If it
/// does so with less than a partition's worth of headroom left, that is
/// escalated to an error log line and a system log row, since inserts fail
/// once the cursor passes the top partition.
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
                log::error!("changelog partition task: failed to get context");
                continue;
            };

            // `ensure_partition_lookahead` is a no-op under SQLite (no partitions
            // to top up); under Postgres it adds partitions when headroom is low.
            // Diesel calls are blocking, so run on a blocking worker to avoid
            // stalling the async runtime.

            let config = partition_config.clone();
            let result = tokio::task::spawn_blocking(move || {
                let outcome = repository::ensure_partition_lookahead(&ctx.connection, &config);
                (ctx, outcome)
            })
            .await;

            match result {
                Ok((_, Ok(PartitionTopUp::Created(created)))) => {
                    if created > 0 {
                        log::info!("changelog partition task created {created} new partition(s)");
                    }
                }
                Ok((ctx, Ok(PartitionTopUp::LockedOut { headroom }))) => {
                    log::warn!(
                        "changelog partition task: lock timeout while adding partitions \
                         ({headroom} cursor values of headroom left); will retry next tick"
                    );
                    if headroom < partition_config.partition_size {
                        escalate(&ctx.connection, headroom);
                    }
                }
                Ok((_, Err(e))) => log::error!("changelog partition task: {e:?}"),
                Err(e) => log::error!("changelog partition task: join error: {e:?}"),
            }
        }
    })
}

fn escalate(connection: &StorageConnection, headroom: i64) {
    let message = format!(
        "Changelog partition top-up locked out with {headroom} cursor values of headroom left; \
         inserts will fail once the cursor passes the top partition"
    );
    // `true`: log the ERROR line to console before inserting the row — the row
    // is itself a changelog insert, which is what may be failing here.
    if let Err(e) = system_log_entry(
        connection,
        SystemLogType::DatabaseError,
        None,
        true,
        SystemLogMessage::Message(&message),
    ) {
        log::error!("changelog partition task: failed to write system log entry: {e:?}");
    }
}
