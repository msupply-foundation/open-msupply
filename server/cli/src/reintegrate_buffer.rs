use anyhow::anyhow;
use indicatif::{ProgressBar, ProgressStyle};
use log::info;
use repository::{
    get_storage_connection_manager,
    migrations::{migrate, MigrationConfig},
    Pagination, SyncBufferRepository, SyncLogV5V6Repository, SyncLogV5V6Sort, SyncLogV5V6SortField,
    SyncVersion,
};
use service::{
    settings::Settings,
    sync::{sync_status::logger::SyncLogger, synchroniser::integrate_and_translate_sync_buffer},
};
use std::time::Duration;
use tokio::task::spawn_blocking;

/// Re-runs sync buffer translation + integration against the `sync_buffer` already in the database,
/// showing a live progress bar.
///
/// Optionally migrates the database first, resets the buffer's integration state, then translates
/// and integrates every pending row.
pub async fn reintegrate_buffer(
    settings: &Settings,
    source_site_id: i32,
    use_transaction: bool,
    should_migrate: bool,
    skip_buffer_reset: bool,
) -> anyhow::Result<()> {
    let connection_manager = get_storage_connection_manager(&settings.database);

    if should_migrate {
        info!("Applying database migrations");
        if let Some(init_sql) = &settings.database.startup_sql() {
            connection_manager.execute(init_sql).unwrap();
        }
        let migration_config = MigrationConfig {
            changelog_partition: settings
                .changelog_partition
                .clone()
                .unwrap_or_default()
                .to_migration_config(),
        };
        migrate(
            &connection_manager.connection().unwrap(),
            None,
            migration_config,
        )
        .expect("Failed to run DB migrations");
        info!("Finished applying database migrations");
    }

    if skip_buffer_reset {
        info!("Skipping sync buffer reset");
    } else {
        info!("Resetting sync buffer integration state");
        // Drop null-data upserts (they cannot translate), then mark every row pending
        // again so integration reprocesses the whole buffer.
        connection_manager.execute(
            "DELETE FROM sync_buffer WHERE action = 'UPSERT' AND data = 'null'; \
             UPDATE sync_buffer SET integration_datetime = NULL, integration_error = NULL, \
               integration_result = NULL, integration_started_datetime = NULL, \
               is_integrated = false;",
        )?;
    }

    // Count what's about to be integrated so the progress bar has a total.
    let total_pending = SyncBufferRepository::new(&connection_manager.connection()?)
        .count_pending(source_site_id, SyncVersion::V5V6, None)?;
    info!("Starting reintegration for source_site_id={source_site_id} ({total_pending} pending)");

    // Run integration on a blocking thread so the async runtime stays free to
    // drive the progress bar.
    let integrate_cm = connection_manager.clone();
    let start = std::time::Instant::now();
    let integration = spawn_blocking(move || -> anyhow::Result<_> {
        let connection = integrate_cm.connection()?;
        let mut logger = SyncLogger::start(&connection)
            .map_err(|e| anyhow!("failed to start sync logger: {e:?}"))?;
        Ok(integrate_and_translate_sync_buffer(
            &connection,
            Some(&mut logger),
            source_site_id,
            use_transaction,
        )?)
    });

    // Progress: poll the latest sync_log row via the repository. Its query applies
    // `or_latest_row`, overlaying the in-memory cached row that the integration updates
    // on every batch — so progress is visible even with --use-transaction, where the
    // DB updates aren't committed until the end (same mechanism the API/UI uses).
    //
    // Logging note: the integrator still emits its per-batch progress at `info` level.
    // Those lines and the progress bar share stderr, so info logs will scroll the bar.
    // Run with `RUST_LOG=warn` for a clean bar, or at `info` to see both.
    let pb = ProgressBar::new(total_pending as u64);
    pb.set_style(
        ProgressStyle::with_template(
            "[{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({percent}%) {msg}",
        )
        .unwrap()
        .progress_chars("=>-"),
    );
    pb.set_message("integrating");
    // indicatif's own redraw thread: keeps elapsed time / bar animation smooth between
    // the slower (1s) data polls below. Independent of how often we re-query the DB.
    pb.enable_steady_tick(Duration::from_millis(120));

    while !integration.is_finished() {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let poll_cm = connection_manager.clone();
        let done = spawn_blocking(move || -> Option<i32> {
            let connection = poll_cm.connection().ok()?;
            // `query` with an explicit descending sort, not `query_one`: query_one
            // passes no sort, which `query` defaults to started_datetime ASC — i.e. the
            // oldest row. We want the latest (current) run's row.
            SyncLogV5V6Repository::new(&connection)
                .query(
                    Pagination::one(),
                    None,
                    Some(SyncLogV5V6Sort {
                        key: SyncLogV5V6SortField::StartedDatetime,
                        desc: Some(true),
                    }),
                )
                .ok()?
                .into_iter()
                .next()
                .and_then(|log| log.sync_log_row.integration_progress_done)
        })
        .await
        .ok()
        .flatten();
        if let Some(done) = done {
            pb.set_position(done as u64);
        }
    }

    let (upserts, deletes, merges) = integration.await??;
    pb.finish_and_clear();

    info!("Reintegration complete in {:?}", start.elapsed());
    info!("Upsert results: {upserts:#?}");
    info!("Delete results: {deletes:#?}");
    info!("Merge results: {merges:#?}");

    Ok(())
}
