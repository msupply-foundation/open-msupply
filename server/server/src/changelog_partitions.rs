use repository::{
    migrations::ChangelogPartitionConfig, PartitionTopUp, StorageConnection, SystemLogType,
};
use service::{
    activity_log::{system_log_entry, SystemLogMessage},
    service_provider::ServiceProvider,
    settings::ChangelogPartitionSettings,
};
use std::sync::Arc;
use tokio::task::JoinHandle;

/// Keeps `changelog`'s postgres partitions topped up ahead of the cursor.
///
/// A tick that times out on a lock (`LockedOut`) is retried next tick.
/// Repeated lock-outs with less than a partition's worth of headroom left are
/// escalated to an error log line and a system log row, since inserts spill
/// into the DEFAULT partition once the cursor passes the top partition.
///
/// Rows found in the DEFAULT partition are reported with a system log row: the
/// write rate outran the lookahead since the previous tick.
pub fn spawn(
    service_provider: Arc<ServiceProvider>,
    settings: ChangelogPartitionSettings,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(settings.interval.as_duration());
        let partition_config = settings.to_migration_config();
        let mut escalation = Escalation::new(partition_config.partition_size);
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
                Ok((
                    ctx,
                    Ok(PartitionTopUp::Created {
                        partitions,
                        overflow_rows,
                    }),
                )) => {
                    escalation.reset();
                    if partitions > 0 {
                        log::info!(
                            "changelog partition task created {partitions} new partition(s)"
                        );
                    }
                    if overflow_rows > 0 {
                        report_overflow(&ctx.connection, overflow_rows, &partition_config);
                    }
                }
                Ok((
                    ctx,
                    Ok(PartitionTopUp::LockedOut {
                        headroom,
                        created,
                        overflow_rows,
                    }),
                )) => {
                    log::warn!(
                        "changelog partition task: lock timeout while adding partitions \
                         ({created} created, {headroom} cursor values of headroom left); \
                         will retry next tick"
                    );
                    if overflow_rows > 0 {
                        report_overflow(&ctx.connection, overflow_rows, &partition_config);
                    }
                    if escalation.record_lock_out(headroom) {
                        escalate(&ctx.connection, headroom);
                    }
                }
                Ok((_, Err(e))) => log::error!("changelog partition task: {e:?}"),
                Err(e) => log::error!("changelog partition task: join error: {e:?}"),
            }
        }
    })
}

/// Tracks consecutive lock-outs so escalation waits for repeated failures, not
/// a single tick that happened to land while something held a lock. A
/// successful tick resets the count. Headroom only falls below one partition
/// after several ticks have failed to top up, so in practice both conditions
/// hold together; the count keeps a lone lock-out with an already-low layout
/// from escalating on its own.
struct Escalation {
    partition_size: i64,
    consecutive_lock_outs: u32,
}

impl Escalation {
    fn new(partition_size: i64) -> Self {
        Self {
            partition_size,
            consecutive_lock_outs: 0,
        }
    }

    /// Returns true when this lock-out should be escalated: at least the second
    /// in a row, with less than one partition's worth of headroom left. Every
    /// qualifying tick returns true, so the system log records the whole
    /// episode.
    fn record_lock_out(&mut self, headroom: i64) -> bool {
        self.consecutive_lock_outs += 1;
        self.consecutive_lock_outs >= 2 && headroom < self.partition_size
    }

    fn reset(&mut self) {
        self.consecutive_lock_outs = 0;
    }
}

fn escalate(connection: &StorageConnection, headroom: i64) {
    let message = format!(
        "Changelog partition top-up locked out with {headroom} cursor values of headroom left; \
         inserts will fall into the DEFAULT partition once the cursor passes the top partition"
    );
    write_system_log(connection, &message);
}

/// Rows were found in the DEFAULT partition: the write rate outran the
/// lookahead since the last tick. The top-up moves them; this records it for
/// the operator.
fn report_overflow(
    connection: &StorageConnection,
    overflow_rows: i64,
    config: &ChangelogPartitionConfig,
) {
    let message = format!(
        "Changelog inserts outran the partition lookahead: {overflow_rows} row(s) found in the \
         DEFAULT partition (partition_size {}, lookahead {}). \
         Raise changelog_partition.lookahead or shorten changelog_partition.interval",
        config.partition_size, config.lookahead
    );
    write_system_log(connection, &message);
}

fn write_system_log(connection: &StorageConnection, message: &str) {
    // `true`: log the ERROR line to console before inserting the row — the row
    // is itself a changelog insert, which is what may be failing here.
    if let Err(e) = system_log_entry(
        connection,
        SystemLogType::DatabaseError,
        None,
        true,
        SystemLogMessage::Message(message),
    ) {
        log::error!("changelog partition task: failed to write system log entry: {e:?}");
    }
}

#[cfg(test)]
mod tests {
    use super::Escalation;

    #[test]
    fn escalation_needs_repeated_lock_outs_and_low_headroom() {
        let mut escalation = Escalation::new(1_000);

        // First lock-out never escalates, even with no headroom.
        assert!(!escalation.record_lock_out(0));
        // Second, but plenty of headroom: still a warning.
        assert!(!escalation.record_lock_out(5_000));
        // Third, headroom equal to a partition: not below, no escalation.
        assert!(!escalation.record_lock_out(1_000));
        // Fourth, repeated and below a partition: escalate.
        assert!(escalation.record_lock_out(999));
        // Fifth, still bad: escalate again — every qualifying tick is recorded.
        assert!(escalation.record_lock_out(10));

        // A successful tick ends the episode; the next one needs two again.
        escalation.reset();
        assert!(!escalation.record_lock_out(10));
        assert!(escalation.record_lock_out(10));
    }
}
