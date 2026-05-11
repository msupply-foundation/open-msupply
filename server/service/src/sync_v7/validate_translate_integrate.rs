use crate::{
    sync::{
        sync_buffer::{write_sync_buffer_error, write_sync_buffer_success},
        ActiveStoresOnSite,
    },
    sync_v7::{serde::deserialize, sync_logger::SyncLogger},
};

use super::validate::*;
use repository::syncv7::{SyncRecordSerializeError, INTEGRATION_ORDER};
use repository::{
    ChangeLogInsertRow, ChangelogSyncType, ChangelogTableName, CurrencyRowDelete, CursorDirection,
    Delete, InvoiceLineRowDelete, InvoiceRowDelete, ItemRowDelete, NameRowDelete, PendingQuery,
    RepositoryError, RowActionType, StockLineRowDelete, StorageConnection, SyncAction,
    SyncBufferRepository, SyncBufferRow, SyncVersion, UnitRowDelete, Upsert,
};
use serde::de::Error as _;
use thiserror::Error;
use util::{datetime_now, format_error};

const PROGRESS_INTERVAL: i64 = 1000;

pub(crate) enum SyncContext {
    Central {
        active_stores: ActiveStoresOnSite,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
    },
}

#[derive(Error, Debug)]
enum Error {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error("Error during record translation")]
    TranslationError(#[from] serde_json::Error),
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

fn parse_table_name(table_name: &str) -> Result<ChangelogTableName, Error> {
    table_name
        .parse::<ChangelogTableName>()
        .map_err(|_| Error::UnknownTableName(table_name.to_string()))
}

fn sync_type(table_name: &ChangelogTableName) -> &'static SyncType {
    match table_name {
        ChangelogTableName::Unit
        | ChangelogTableName::Currency
        | ChangelogTableName::Name
        | ChangelogTableName::Store
        | ChangelogTableName::LocationType
        | ChangelogTableName::Item => &SyncType::Central,
        ChangelogTableName::StockLine
        | ChangelogTableName::Invoice
        | ChangelogTableName::InvoiceLine => &SyncType::Remote,
        // Default to Central for unknown types
        _ => &SyncType::Central,
    }
}

fn changelog(
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
        ..Default::default()
    }
}

fn integrate_upsert(
    connection: &StorageConnection,
    upsert: Box<dyn Upsert>,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), Error> {
    let changelog = changelog(table_name, RowActionType::Upsert, row);
    upsert
        .upsert_sync(
            connection,
            ChangelogSyncType::SyncTypeV7 {
                changelog_row: changelog,
            },
        )
        .map_err(Error::IntegrationError)?;

    Ok(())
}

fn translate_delete(
    table_name: &ChangelogTableName,
    record_id: &str,
) -> Result<Box<dyn Delete>, Error> {
    let id = record_id.to_string();
    let delete: Box<dyn Delete> = match table_name {
        ChangelogTableName::Unit => Box::new(UnitRowDelete(id)),
        ChangelogTableName::Currency => Box::new(CurrencyRowDelete(id)),
        ChangelogTableName::Name => Box::new(NameRowDelete(id)),
        ChangelogTableName::Item => Box::new(ItemRowDelete(id)),
        ChangelogTableName::StockLine => Box::new(StockLineRowDelete(id)),
        ChangelogTableName::Invoice => Box::new(InvoiceRowDelete(id)),
        ChangelogTableName::InvoiceLine => Box::new(InvoiceLineRowDelete(id)),
        _ => {
            return Err(Error::TranslationError(serde_json::Error::custom(format!(
                "No delete translator for table {:?}",
                table_name
            ))))
        }
    };

    Ok(delete)
}

fn integrate_delete(
    connection: &StorageConnection,
    delete: Box<dyn Delete>,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), Error> {
    let changelog = changelog(table_name, RowActionType::Delete, row);
    delete
        .delete_sync(
            connection,
            ChangelogSyncType::SyncTypeV7 {
                changelog_row: changelog,
            },
        )
        .map_err(Error::IntegrationError)?;

    Ok(())
}

fn validate_translate_integrate_one(
    connection: &StorageConnection,
    row: &SyncBufferRow,
    sync_context: &SyncContext,
) -> Result<(), Error> {
    let table_name = parse_table_name(&row.table_name)?;
    let st = sync_type(&table_name);

    match sync_context {
        SyncContext::Central { active_stores } => validate_on_central(row, st, active_stores)?,
        SyncContext::Remote {
            is_initialising,
            active_stores,
        } => validate_on_remote(row, st, active_stores, *is_initialising)?,
    };

    match row.action {
        SyncAction::Upsert => {
            let upsert = deserialize(&table_name, &row.data)?;
            integrate_upsert(connection, upsert, table_name, row)
        }
        SyncAction::Delete => {
            let delete = translate_delete(&table_name, &row.record_id)?;
            integrate_delete(connection, delete, table_name, row)
        }
        _ => Err(Error::UnsupportedAction(row.action.clone())),
    }
}

pub fn validate_translate_integrate<'a>(
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
            table_name: &table.to_string(),
            action: action.clone(),
            direction,
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
