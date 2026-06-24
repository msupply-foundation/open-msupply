use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{serde::deserialize, sync_logger::SyncLogger},
};

use super::validate::*;

use chrono::NaiveDateTime;
use itertools::{Either, Itertools};
use repository::syncv7::{SyncRecordSerializeError, INTEGRATION_ORDER};
use repository::*;
use thiserror::Error;
use util::{datetime_now, format_error};

const PROGRESS_INTERVAL: i64 = 1000;
const INTEGRATION_BATCH_SIZE: i64 = 10_000;

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
    PatientLookup { active_stores: ActiveStoresOnSite },
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

enum ErrorOrOperation {
    Error(Error),
    BatchOp(Vec<(BatchOperation, String, Option<ChangeLogInsertRow>)>),
}

// Should be one table at a time
fn validate_and_translate(
    connection: &StorageConnection,
    rows: Vec<SyncBufferRow>,
    sync_context: &SyncContext,
) -> Vec<(i32, ErrorOrOperation)> {
    rows.into_iter()
        .map(|row| {
            let row_cursor = row.cursor;
            let table_name = match parse_table_name(&row.table_name) {
                Ok(name) => name,
                Err(e) => return (row_cursor, ErrorOrOperation::Error(e)),
            };

            let validation_result = match sync_context {
                SyncContext::Central {
                    source_site_active_store_ids: source_site_store_ids,
                } => validate_on_central(&row, &table_name, source_site_store_ids),
                SyncContext::Remote {
                    is_initialising,
                    active_stores,
                } => validate_on_remote(&row, &table_name, active_stores, *is_initialising),
                SyncContext::PatientLookup { .. } => Ok(()), // Patient records belong to another store
            };

            if let Err(e) = validation_result {
                return (
                    row_cursor,
                    ErrorOrOperation::Error(Error::ValidationError(e)),
                );
            };

            let translation_result = match &row.action {
                SyncAction::Upsert => deserialize(connection, &table_name, row, sync_context)
                    .map(|upserts| {
                        upserts
                            .into_iter()
                            .map(|(u, r, c)| (BatchOperation::Upsert(u), r, c))
                            .collect()
                    })
                    .map_err(Error::DeserializeError),
                SyncAction::Delete => {
                    // v7 supplies the delete changelog from the sender's buffer row (which
                    // carries the store_id/transfer_store_id/patient_id routing fields), so
                    // the delete still propagates onward. It's written after the delete in
                    // `write_changelogs_and_sync_buffer`, unlike v5/v6 which derives it from
                    // the still-present DB row before deleting.
                    let changelog =
                        create_changelog(table_name.clone(), RowActionType::Delete, &row);
                    Ok(vec![(
                        BatchOperation::Delete {
                            table_name,
                            record_id: row.record_id.clone(),
                        },
                        row.record_id,
                        Some(changelog),
                    )])
                }
                SyncAction::Merge => Err(Error::UnsupportedAction(row.action.clone())),
            };

            match translation_result {
                Ok(ops) => (row_cursor, ErrorOrOperation::BatchOp(ops)),
                Err(e) => (row_cursor, ErrorOrOperation::Error(e)),
            }
        })
        .collect()
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

fn integrate_in_batch(
    connection: &StorageConnection,
    ops: Vec<(
        i32,
        Vec<(BatchOperation, String, Option<ChangeLogInsertRow>)>,
    )>,
    wrap_record_in_tx: bool,
) -> (Vec<(i32, Error)>, Vec<(i32, Option<ChangeLogInsertRow>)>) {
    let flattened: Vec<_> = ops
        .into_iter()
        .flat_map(|(key, inner)| inner.into_iter().map(move |t| (key, t)))
        .collect();

    let input = flattened
        .into_iter()
        .map(
            |(buffer_cursor, (op, record_id, changelog_row))| BatchDbOperation {
                priority: 1,
                operation: op,
                extra: (buffer_cursor, changelog_row),
                dedup_key: record_id,
            },
        )
        .collect();

    let result = batch_operations(connection, input, wrap_record_in_tx);

    let (errs, oks): (Vec<_>, Vec<_>) = result.into_iter().partition_map(
        |BatchDbOperationResult { extra, error, .. }| match error {
            Some(err) => Either::Left((extra, err)),
            None => Either::Right(extra),
        },
    );

    (
        errs.into_iter()
            .flat_map(|(extra, error)| {
                extra
                    .into_iter()
                    .map(move |e| (e.0, Error::RepositoryError(error.clone())))
            })
            .collect(),
        oks.into_iter()
            .flat_map(|r| r.into_iter().map(move |r_inner| r_inner))
            .collect(),
    )
}

fn write_changelogs_and_sync_buffer(
    connection: &StorageConnection,
    started: NaiveDateTime,
    translation_errors: Vec<(i32, Error)>,
    integration_errors: Vec<(i32, Error)>,
    success: Vec<(i32, Option<ChangeLogInsertRow>)>,
) -> Result<i64, RepositoryError> {
    let (success_cursors, changelog_rows): (Vec<_>, Vec<_>) = success.into_iter().unzip();
    let changelog_rows = changelog_rows.into_iter().flatten().collect();

    ChangelogRepository::new(connection)
        .batch_insert(changelog_rows)
        .map_err(RepositoryError::from)?;

    let mut buffer_errors = translation_errors;
    buffer_errors.extend(integration_errors);

    let mut buffer_updates = buffer_errors
        .into_iter()
        .map(|(cursor, error)| IntegrationResultUpdate {
            cursor,
            started_datetime: started,
            result: IntegrationResult::Error,
            error: Some(format_error(&error)),
        })
        .collect::<Vec<_>>();

    let success_updates = success_cursors
        .into_iter()
        .map(|cursor| IntegrationResultUpdate {
            cursor,
            started_datetime: started,
            result: IntegrationResult::Success,
            error: None,
        });

    buffer_updates.extend(success_updates);

    let duduped_buffer_updates = buffer_updates
        .into_iter()
        .unique_by(|u| u.cursor)
        .collect::<Vec<_>>();

    SyncBufferRepository::new(connection).set_batch_integration_result(&duduped_buffer_updates)?;

    Ok(duduped_buffer_updates.len() as i64)
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

    let integration_tables: Vec<&str> = INTEGRATION_ORDER.iter().map(|t| t.as_ref()).collect();
    let mut total = repo.count_pending(
        source_site_id,
        SyncVersion::V7,
        reference_id,
        Some(&integration_tables),
    )?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let get_sync_buffer_rows = |table: &ChangelogTableName, action: SyncAction| {
        repo.pending_ordered_by_cursor(PendingQuery {
            source_site_id,
            sync_version: SyncVersion::V7,
            reference_id,
            table_name: table.as_ref(),
            action: action.clone(),
            direction: CursorDirection::Asc,
            limit: INTEGRATION_BATCH_SIZE,
        })
    };

    // Todo, can we combine with SyncBufferIntegrator ?

    // Upserts: parents before children, rows ordered by cursor ASC within each table.
    for table in INTEGRATION_ORDER {
        loop {
            let rows = get_sync_buffer_rows(table, SyncAction::Upsert)?;

            if rows.is_empty() {
                break;
            }
            log::info!("Integrating table {table} upsert records");
            integrate_sync_buffer_batch(
                connection,
                table,
                &mut sync_context,
                &mut logger,
                rows,
                &mut total,
                &mut last_progress,
                wrap_record_in_tx,
            )?;
        }
    }

    // Deletes: children before parents, rows ordered by cursor DESC within each table.
    for table in INTEGRATION_ORDER.iter().rev() {
        loop {
            let rows = get_sync_buffer_rows(table, SyncAction::Delete)?;
            if rows.is_empty() {
                break;
            }
            log::info!("Integrating table {table} delete records");
            integrate_sync_buffer_batch(
                connection,
                table,
                &mut sync_context,
                &mut logger,
                rows,
                &mut total,
                &mut last_progress,
                wrap_record_in_tx,
            )?;
        }
    }

    Ok(())
}

fn integrate_sync_buffer_batch<'a>(
    connection: &StorageConnection,
    table: &ChangelogTableName,
    sync_context: &mut SyncContext,
    logger: &mut Option<&mut SyncLogger<'a>>,
    rows: Vec<SyncBufferRow>,
    total: &mut i64,
    last_progress: &mut i64,
    wrap_record_in_tx: bool,
) -> Result<(), RepositoryError> {
    log::info!("Number of records to integrate  {}", rows.len());

    let had_store_records = *table == ChangelogTableName::Store && !rows.is_empty();
    let started = datetime_now();

    let translated = validate_and_translate(connection, rows, &sync_context);

    let (translation_errors, operations): (Vec<_>, Vec<_>) =
        translated
            .into_iter()
            .partition_map(|(buffer_cursor, result)| match result {
                ErrorOrOperation::Error(e) => Either::Left((buffer_cursor, e)),
                ErrorOrOperation::BatchOp(ops) => Either::Right((buffer_cursor, ops)),
            });

    let (integration_errors, oks) = integrate_in_batch(connection, operations, wrap_record_in_tx);

    // Do this in transaction either way to ensure changelog and buffer are consistent
    // Rollback all sync_buffer integrations if there is an error
    let number_of_buffers_updated = connection
        .transaction_sync(|con| {
            write_changelogs_and_sync_buffer(
                con,
                started,
                translation_errors,
                integration_errors,
                oks,
            )
        })
        .map_err(|e| e.to_inner_error())?;

    *total -= number_of_buffers_updated;

    if let Some(logger) = logger.as_mut() {
        if *total / PROGRESS_INTERVAL <= *last_progress {
            logger.progress(*total)?;
            *last_progress -= 1;
        }
    }

    // Refresh active stores after any Store batch (upsert or delete)
    // so downstream Remote records validate against fresh state.
    // Central path doesn't need refresh — Store rows are Central records
    if had_store_records {
        if let SyncContext::Remote {
            is_initialising: _,
            active_stores,
        } = sync_context
        {
            *active_stores = ActiveStoresOnSite::get(connection).unwrap();
        }
    }

    Ok(())
}

pub(crate) fn validate_translate_integrate_in_memory(
    connection: &StorageConnection,
    rows: &[SyncBufferRow],
    mut sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    connection
        .transaction_sync(|con| -> Result<(), RepositoryError> {
            let mut total = rows.len() as i64;
            let mut last_progress = total / PROGRESS_INTERVAL;
            integrate_sync_buffer_batch(
                con,
                &ChangelogTableName::Name, // doesn't matter which table we use for validation/translation here as long as it's consistent with the test data
                &mut sync_context,
                &mut None,
                rows.to_vec(),
                &mut total,
                &mut last_progress,
                false, // doesn't matter for test data as long as it's consistent with the translation function
            )
        })
        .map_err(|e| e.to_inner_error())
}
