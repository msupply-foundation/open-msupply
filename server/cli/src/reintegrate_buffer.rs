use anyhow::anyhow;
use log::info;
use repository::{
    get_storage_connection_manager,
    migrations::{migrate, MigrationConfig},
    StorageConnectionManager, SyncBufferRepository, SyncVersion,
};
use service::{
    settings::Settings,
    sync::{
        sync_status::logger::SyncLogger,
        synchroniser::integrate_and_translate_sync_buffer_filtered,
    },
};

/// Re-runs sync buffer translation + integration against the `sync_buffer` already in the database.
///
/// Optionally migrates the database first, resets the buffer's integration state, then translates
/// and integrates every pending row. `tables`, when set, restricts integration to those sync
/// buffer tables. When `errors_only` is set, only rows that previously errored are reset (and so
/// reprocessed). The integrator logs per-batch progress at `info` level.
pub fn reintegrate_buffer(
    settings: &Settings,
    source_site_id: i32,
    use_transaction: bool,
    should_migrate: bool,
    skip_buffer_reset: bool,
    errors_only: bool,
    tables: Option<Vec<String>>,
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

    match (skip_buffer_reset, errors_only) {
        // Skip reset. `--errors-only` conflicts with `--skip-buffer-reset` at the CLI layer,
        // so (true, true) can't occur; `(true, _)` covers the only reachable skip case.
        (true, _) => info!("Skipping sync buffer reset"),
        // Reset only errored records. Ignored rows also carry an integration_error (the ignore
        // message), so exclude IGNORED to retry genuine errors only.
        (false, true) => {
            info!("Resetting sync buffer integration state for errored records only");
            reset_buffer(
                &connection_manager,
                " AND integration_error IS NOT NULL AND integration_result != 'IGNORED'",
            )?;
        }
        // Reset all records
        (false, false) => {
            info!("Resetting sync buffer integration state");
            reset_buffer(&connection_manager, "")?;
        }
    }

    if let Some(tables) = &tables {
        info!("Scoping reintegration to tables: {tables:?}");
    }

    let connection = connection_manager.connection()?;
    let total_pending = SyncBufferRepository::new(&connection).count_pending(
        source_site_id,
        SyncVersion::V5V6,
        None,
        tables.as_deref(),
    )?;
    info!("Starting reintegration for source_site_id={source_site_id} ({total_pending} pending)");

    // The integrator logs per-batch progress at `info` level as it goes.
    let start = std::time::Instant::now();
    let mut logger =
        SyncLogger::start(&connection).map_err(|e| anyhow!("failed to start sync logger: {e:?}"))?;
    let (upserts, deletes, merges) = integrate_and_translate_sync_buffer_filtered(
        &connection,
        Some(&mut logger),
        source_site_id,
        use_transaction,
        tables,
    )?;

    info!("Reintegration complete in {:?}", start.elapsed());
    info!("Upsert results: {upserts:#?}");
    info!("Delete results: {deletes:#?}");
    info!("Merge results: {merges:#?}");

    Ok(())
}

/// Drops null-data upserts (they cannot translate), then marks the targeted rows pending again so
/// integration reprocesses them. `errored_filter` narrows both statements to errored rows (empty
/// string resets the whole buffer).
fn reset_buffer(
    connection_manager: &StorageConnectionManager,
    errored_filter: &str,
) -> anyhow::Result<()> {
    connection_manager.execute(&format!(
        "DELETE FROM sync_buffer WHERE action = 'UPSERT' AND data = 'null'{errored_filter}; \
         UPDATE sync_buffer SET integration_datetime = NULL, integration_error = NULL, \
           integration_result = NULL, integration_started_datetime = NULL, \
           is_integrated = false WHERE 1 = 1{errored_filter};",
    ))?;
    Ok(())
}
