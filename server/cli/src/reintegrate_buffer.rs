use anyhow::anyhow;
use log::info;
use repository::{
    get_storage_connection_manager,
    migrations::{migrate, MigrationConfig},
    StorageConnectionManager, SyncBufferRepository, SyncVersion,
};
use service::{
    settings::Settings,
    sync::{sync_status::logger::SyncLogger, synchroniser::integrate_and_translate_sync_buffer},
};

/// Re-runs sync buffer translation + integration against the `sync_buffer` already in the database.
///
/// Optionally migrates the database first, resets the buffer's integration state, then translates
/// and integrates every pending row. Scoping is done entirely through the reset: `tables` and/or
/// `errors_only` narrow which rows are reset to pending, and integration only ever processes
/// pending (`is_integrated = false`) rows — so the production integration path is untouched. The
/// integrator logs per-batch progress at `info` level.
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

    if !skip_buffer_reset {
        reset_sync_buffer(&connection_manager, errors_only, tables.as_deref())?;
    } else {
        info!("Skipping sync buffer reset")
    }

    let connection = connection_manager.connection()?;
    let total_pending = SyncBufferRepository::new(&connection).count_pending(
        source_site_id,
        SyncVersion::V5V6,
        None,
        None,
    )?;
    info!("Starting reintegration for source_site_id: {source_site_id} pending: {total_pending}");

    // The integrator logs per-batch progress at `info` level as it goes.
    let start = std::time::Instant::now();
    let mut logger = SyncLogger::start(&connection)
        .map_err(|e| anyhow!("failed to start sync logger: {e:?}"))?;
    let (upserts, deletes, merges) = integrate_and_translate_sync_buffer(
        &connection,
        Some(&mut logger),
        source_site_id,
        use_transaction,
    )?;

    info!("Reintegration complete in {:?}", start.elapsed());
    info!("Upsert results: {upserts:#?}");
    info!("Delete results: {deletes:#?}");
    info!("Merge results: {merges:#?}");

    Ok(())
}

/// Resets the sync buffer ahead of integration, optionally scoped by `tables` and/or `errors_only`.
///
/// Integration only processes pending rows, so scoping is just a matter of which rows get reset to
/// pending — no change to the production integration path. Builds a target predicate from the
/// requested filters and hands it to [`reset_buffer`].
fn reset_sync_buffer(
    connection_manager: &StorageConnectionManager,
    errors_only: bool,
    tables: Option<&[String]>,
) -> anyhow::Result<()> {
    let mut clauses: Vec<String> = Vec::new();
    if let Some(tables) = tables {
        let list = tables
            .iter()
            .map(|table| format!("'{table}'"))
            .collect::<Vec<_>>()
            .join(", ");
        clauses.push(format!("table_name IN ({list})"));
    }
    if errors_only {
        // Ignored rows also carry an integration_error (the ignore message), so exclude IGNORED to
        // retry genuine errors only.
        clauses.push("integration_error IS NOT NULL AND integration_result != 'IGNORED'".into());
    }

    if clauses.is_empty() {
        info!("Resetting sync buffer integration state");
        // `1 = 1` resets the whole buffer.
        return reset_buffer(connection_manager, "1 = 1", false);
    }

    let target = clauses.join(" AND ");
    info!("Resetting sync buffer integration state for rows where: {target}");
    reset_buffer(connection_manager, &target, true)
}

/// Resets the sync buffer so integration reprocesses the rows matching `target` (a SQL boolean
/// predicate). Drops null-data upserts in the target set (they cannot translate). When `scoped`,
/// first marks the pending rows integrated so that only the target rows are left pending; otherwise
/// the whole buffer is reset to pending.
fn reset_buffer(
    connection_manager: &StorageConnectionManager,
    target: &str,
    scoped: bool,
) -> anyhow::Result<()> {
    let mut sql = format!(
        "DELETE FROM sync_buffer WHERE action = 'UPSERT' AND data = 'null' AND ({target});"
    );
    if scoped {
        // Mark the currently-pending rows integrated, then re-open just the target rows below.
        // Restricting to `is_integrated = false` avoids rewriting the whole (possibly huge)
        // buffer when only a small target subset is being reopened.
        sql.push_str(" UPDATE sync_buffer SET is_integrated = true WHERE is_integrated = false;");
    }
    sql.push_str(&format!(
        " UPDATE sync_buffer SET integration_datetime = NULL, integration_error = NULL, \
          integration_result = NULL, integration_started_datetime = NULL, \
          is_integrated = false WHERE {target};"
    ));
    connection_manager.execute(&sql)?;
    Ok(())
}
