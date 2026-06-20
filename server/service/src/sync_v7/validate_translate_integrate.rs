use crate::{
    sync::{
        sync_buffer::{
            write_sync_buffer_error, write_sync_buffer_ignored, write_sync_buffer_success,
        },
        ActiveStoresOnSite,
    },
    sync_v7::{
        serde::{deserialize, V7Upsert},
        sync_logger::SyncLogger,
    },
};

use super::validate::*;
use repository::syncv7::{SyncRecordSerializeError, INTEGRATION_ORDER};
use repository::*;
use thiserror::Error;
use util::{datetime_now, format_error};

const PROGRESS_INTERVAL: i64 = 1000;

pub(crate) enum SyncContext {
    Central {
        source_site_active_store_ids: Vec<String>,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
    },
    /// Records arrived via a patient-lookup pull. They belong to other sites'
    /// stores.
    PatientLookup,
}

#[derive(Error, Debug)]
enum Error {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error("Error during record translation")]
    TranslationError(#[from] serde_json::Error),
    #[error("Delete translator not found for table: {0}")]
    DeleteTranslatorNotFound(ChangelogTableName),
    #[error("Error during record deserialization: {0}")]
    DeserializeError(#[from] SyncRecordSerializeError),
    #[error("Error during record validation")]
    ValidationError(#[from] ValidationError),
    #[error("Error during record integration")]
    IntegrationError(#[source] RepositoryError),
    #[error("Unknown table name: {0}")]
    UnknownTableName(String),
    #[error("Unsupported sync action: {0:?}")]
    UnsupportedAction(SyncAction),
}

pub(crate) fn create_changelog(
    table_name: ChangelogTableName,
    action: RowActionType,
    row: &SyncBufferRow,
) -> ChangeLogInsertRow {
    ChangeLogInsertRow {
        table_name,
        record_id: row.record_id.clone(),
        row_action: action,
        store_id: row.store_id.clone(),
        source_site_id: Some(row.source_site_id),
        transfer_store_id: row.transfer_store_id.clone(),
        patient_id: row.patient_id.clone(),
    }
}

fn parse_table_name(table_name: &str) -> Result<ChangelogTableName, Error> {
    table_name
        .parse::<ChangelogTableName>()
        .map_err(|_| Error::UnknownTableName(table_name.to_string()))
}

fn integrate_upserts(
    connection: &StorageConnection,
    upsert: Vec<(V7Upsert, ChangeLogInsertRow)>,
) -> Result<(), Error> {
    let changelog_repo = ChangelogRepository::new(connection);
    for (upsert, changelog_row) in upsert {
        // Write the row, then insert the v7-supplied changelog row (NonSync rows are not
        // in the changelog, so the paired row is a default and not inserted).
        upsert
            .integrate_no_changelog(connection)
            .map_err(Error::IntegrationError)?;
        if let V7Upsert::Row(_) = upsert {
            changelog_repo
                .insert(&changelog_row)
                .map_err(Error::IntegrationError)?;
        }
    }

    Ok(())
}
fn integrate_delete(
    connection: &StorageConnection,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), Error> {
    // Delete the row (dispatched by table). A `NoDeletePath` outcome means the table
    // is never deleted via sync — preserve the previous "delete translator not found".
    match integrate_delete_no_changelog(connection, &table_name, &row.record_id)
        .map_err(Error::IntegrationError)?
    {
        DeleteOutcome::NoDeletePath => return Err(Error::DeleteTranslatorNotFound(table_name)),
        DeleteOutcome::Deleted => {}
    }
    // Insert the v7-supplied changelog row.
    let changelog_row = create_changelog(table_name, RowActionType::Delete, row);
    ChangelogRepository::new(connection)
        .insert(&changelog_row)
        .map_err(Error::IntegrationError)?;
    Ok(())
}

fn validate_translate_integrate_one(
    connection: &StorageConnection,
    row: &SyncBufferRow,
    sync_context: &SyncContext,
) -> Result<(), Error> {
    let table_name = parse_table_name(&row.table_name)?;

    match sync_context {
        SyncContext::Central {
            source_site_active_store_ids: source_site_store_ids,
        } => validate_on_central(row, &table_name, source_site_store_ids)?,
        SyncContext::Remote {
            is_initialising,
            active_stores,
        } => validate_on_remote(row, &table_name, active_stores, *is_initialising)?,
        SyncContext::PatientLookup => {} // Patient records belong to another store
    };

    match row.action {
        SyncAction::Upsert => {
            let upserts = deserialize(connection, &table_name, &row, sync_context)?;
            integrate_upserts(connection, upserts)
        }
        SyncAction::Delete => integrate_delete(connection, table_name, row),
        _ => Err(Error::UnsupportedAction(row.action.clone())),
    }
}

pub(crate) fn validate_translate_integrate<'a>(
    connection: &StorageConnection,
    logger: Option<&mut SyncLogger<'a>>,
    source_site_id: i32,
    reference_id: Option<&str>,
    sync_context: SyncContext,
    is_initialising: bool,
) -> Result<(), RepositoryError> {
    // During initialisation we don't need transaction as user can't access database
    // and processors are not running, however we still want it for sqlite as it speeds it up
    let dont_wrap_in_tx = is_initialising && cfg!(not(feature = "postgres"));
    let wrap_in_outer_tx = !dont_wrap_in_tx;

    // When not initialising, isolate each record + changelog write in its own
    // nested transaction so a single failure doesn't roll back the whole batch.
    // This is not needed for sqlite as it doesn't poison transaction on failure
    let wrap_record_in_tx = wrap_in_outer_tx && cfg!(feature = "postgres");

    // Even when initialising
    if wrap_in_outer_tx {
        return connection
            .transaction_sync(move |t_con| {
                validate_translate_integrate_inner(
                    t_con,
                    logger,
                    source_site_id,
                    reference_id,
                    sync_context,
                    wrap_record_in_tx,
                )
            })
            .map_err(|e| e.to_inner_error());
    }

    validate_translate_integrate_inner(
        connection,
        logger,
        source_site_id,
        reference_id,
        sync_context,
        wrap_record_in_tx,
    )
}

fn validate_translate_integrate_inner<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    source_site_id: i32,
    reference_id: Option<&str>,
    sync_context: SyncContext,
    wrap_record_in_tx: bool,
) -> Result<(), RepositoryError> {
    // TODO this is too hacky, prefer active store cache
    let mut sync_context = sync_context;

    let repo = SyncBufferRepository::new(connection);

    let mut total = repo.count_pending(source_site_id, SyncVersion::V7, reference_id)?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut integrate_table = |logger: &mut Option<&mut SyncLogger<'a>>,
                               table: &ChangelogTableName,
                               action: SyncAction,
                               direction: CursorDirection|
     -> Result<(), RepositoryError> {
        log::info!("Integrating table {table} with action {action}");

        let rows = repo.pending_ordered_by_cursor(PendingQuery {
            source_site_id,
            sync_version: SyncVersion::V7,
            reference_id,
            table_name: table.as_ref(),
            action: action.clone(),
            direction,
            limit: i64::MAX,
        })?;

        log::info!("Number of records to integrate  {}", rows.len());

        let had_store_records = *table == ChangelogTableName::Store && !rows.is_empty();

        for row in &rows {
            let started = datetime_now();
            let one_result = if wrap_record_in_tx {
                connection
                    .transaction_sync_etc(
                        |sub| validate_translate_integrate_one(sub, row, &sync_context),
                        false,
                    )
                    .map_err(|e| e.to_inner_error())
            } else {
                validate_translate_integrate_one(connection, row, &sync_context)
            };
            match one_result {
                Ok(()) => write_sync_buffer_success(connection, row.cursor, started)?,
                Err(e @ Error::ValidationError(_)) => {
                    write_sync_buffer_ignored(connection, row.cursor, started, &format_error(&e))?;
                }
                Err(e) => {
                    write_sync_buffer_error(connection, row.cursor, started, &format_error(&e))?;
                }
            }

            total -= 1;

            if let Some(logger) = logger.as_mut() {
                if total / PROGRESS_INTERVAL <= last_progress {
                    logger.progress(total)?;
                    last_progress -= 1;
                }
            }
        }

        // Refresh active stores after any Store batch (upsert or delete)
        // so downstream Remote records validate against fresh state.
        // Central path doesn't need refresh — Store rows are Central records
        if had_store_records {
            if let SyncContext::Remote {
                is_initialising: _,
                active_stores,
            } = &mut sync_context
            {
                *active_stores = ActiveStoresOnSite::get(connection).unwrap();
            }
        }

        Ok(())
    };

    // Upserts: parents before children, rows ordered by cursor ASC within each table.
    for table in INTEGRATION_ORDER {
        integrate_table(&mut logger, table, SyncAction::Upsert, CursorDirection::Asc)?;
    }

    // Deletes: children before parents, rows ordered by cursor DESC within each table.
    for table in INTEGRATION_ORDER.iter().rev() {
        integrate_table(
            &mut logger,
            table,
            SyncAction::Delete,
            CursorDirection::Desc,
        )?;
    }

    Ok(())
}

pub(crate) fn validate_translate_integrate_in_memory(
    connection: &StorageConnection,
    rows: &[SyncBufferRow],
    sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    connection
        .transaction_sync(|con| -> Result<(), RepositoryError> {
            let by_table_action = |table: &ChangelogTableName, action: SyncAction| {
                let table_name = table.to_string();
                let mut filtered: Vec<&SyncBufferRow> = rows
                    .iter()
                    .filter(|r| r.table_name == table_name && r.action == action)
                    .collect();
                match action {
                    SyncAction::Delete => filtered.sort_by_key(|r| std::cmp::Reverse(r.cursor)),
                    _ => filtered.sort_by_key(|r| r.cursor),
                };
                filtered
            };

            for table in INTEGRATION_ORDER {
                for row in by_table_action(table, SyncAction::Upsert) {
                    validate_translate_integrate_one(con, row, &sync_context).map_err(|e| {
                        RepositoryError::as_db_error(
                            &format!(
                                "Patient lookup integration ({} {} {})",
                                row.table_name, row.action, row.record_id
                            ),
                            format_error(&e),
                        )
                    })?;
                }
            }
            for table in INTEGRATION_ORDER.iter().rev() {
                for row in by_table_action(table, SyncAction::Delete) {
                    validate_translate_integrate_one(con, row, &sync_context).map_err(|e| {
                        RepositoryError::as_db_error(
                            &format!(
                                "Patient lookup integration ({} {} {})",
                                row.table_name, row.action, row.record_id
                            ),
                            format_error(&e),
                        )
                    })?;
                }
            }
            Ok(())
        })
        .map_err(|e| e.to_inner_error())
}
