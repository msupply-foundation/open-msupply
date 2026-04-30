use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{sync_logger::SyncLogger, write_sync_buffer_success},
};

use super::{validate::*, write_sync_buffer_error};
use repository::syncv7::INTEGRATION_ORDER;
use repository::{
    ChangeLogInsertRow, ChangelogSyncType, ChangelogTableName, CurrencyRow, CurrencyRowDelete,
    DatetimeFilter, Delete, EqualFilter, InvoiceLineRow, InvoiceLineRowDelete, InvoiceRow,
    InvoiceRowDelete, ItemRow, ItemRowDelete, LocationTypeRow, LocationTypeRowDelete, NameRow,
    NameRowDelete, RepositoryError, RowActionType, StockLineRow, StockLineRowDelete,
    StorageConnection, StoreRow, StoreRowDelete, SyncAction, SyncBufferFilter,
    SyncBufferRepository, SyncBufferRow, UnitRow, UnitRowDelete, Upsert,
};
use serde::de::Error as _;
use thiserror::Error;

pub(crate) enum SyncContext {
    Central {
        active_stores: ActiveStoresOnSite,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
    },
}

static PROGRESS_INTERVAL: i64 = 1000;

#[derive(Error, Debug)]
enum Error {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error("Error during record translation")]
    TranslationError(#[from] serde_json::Error),
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
        // Default to Remote for unknown types
        _ => &SyncType::Remote,
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
        source_site_id: row.source_site_id,
        transfer_store_id: row.transfer_store_id.clone(),
        patient_id: row.patient_id.clone(),
        ..Default::default()
    }
}

fn translate_upsert(
    table_name: &ChangelogTableName,
    data: &serde_json::Value,
) -> Result<Box<dyn Upsert>, Error> {
    let upsert: Box<dyn Upsert> = match table_name {
        ChangelogTableName::Unit => Box::new(serde_json::from_value::<UnitRow>(data.clone())?),
        ChangelogTableName::Currency => {
            Box::new(serde_json::from_value::<CurrencyRow>(data.clone())?)
        }
        ChangelogTableName::Name => Box::new(serde_json::from_value::<NameRow>(data.clone())?),
        ChangelogTableName::Store => Box::new(serde_json::from_value::<StoreRow>(data.clone())?),
        ChangelogTableName::LocationType => {
            Box::new(serde_json::from_value::<LocationTypeRow>(data.clone())?)
        }
        ChangelogTableName::Item => Box::new(serde_json::from_value::<ItemRow>(data.clone())?),
        ChangelogTableName::StockLine => {
            Box::new(serde_json::from_value::<StockLineRow>(data.clone())?)
        }
        ChangelogTableName::Invoice => {
            Box::new(serde_json::from_value::<InvoiceRow>(data.clone())?)
        }
        ChangelogTableName::InvoiceLine => {
            Box::new(serde_json::from_value::<InvoiceLineRow>(data.clone())?)
        }
        _ => {
            return Err(Error::TranslationError(serde_json::Error::custom(format!(
                "No upsert translator for table {:?}",
                table_name
            ))))
        }
    };

    Ok(upsert)
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
        ChangelogTableName::Store => Box::new(StoreRowDelete(id)),
        ChangelogTableName::LocationType => Box::new(LocationTypeRowDelete(id)),
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

enum Translated {
    Upsert(Box<dyn Upsert>),
    Delete(Box<dyn Delete>),
}

fn integrate(
    connection: &StorageConnection,
    translated: Translated,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), RepositoryError> {
    match translated {
        Translated::Upsert(upsert) => {
            let changelog = changelog(table_name, RowActionType::Upsert, row);
            upsert.upsert_sync(
                connection,
                ChangelogSyncType::SyncTypeV7 {
                    changelog_row: changelog,
                },
            )?;
        }
        Translated::Delete(delete) => {
            let changelog = changelog(table_name, RowActionType::Delete, row);
            delete.delete_v7(connection, changelog)?;
        }
    }

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

    let translated = match row.action {
        SyncAction::Upsert => Translated::Upsert(translate_upsert(&table_name, &row.data)?),
        SyncAction::Delete => Translated::Delete(translate_delete(&table_name, &row.record_id)?),
        _ => return Err(Error::UnsupportedAction(row.action.clone())),
    };

    integrate(connection, translated, table_name, row).map_err(Error::IntegrationError)?;

    Ok(())
}

// TODO transactions
pub fn validate_translate_integrate<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    sync_buffer_filter: Option<SyncBufferFilter>,
    sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    // TODO this is too hacky, prefer active store cache
    let mut sync_context = sync_context;

    let base_filter = SyncBufferFilter::new().integration_datetime(DatetimeFilter::is_null(true));

    let filter = match sync_buffer_filter {
        Some(extra) => SyncBufferFilter {
            integration_datetime: base_filter.integration_datetime,
            source_site_id: extra.source_site_id,
            ..extra
        },
        None => base_filter,
    };

    let mut total = SyncBufferRepository::new(connection).count(filter.clone())?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut integrate_table = |table: &ChangelogTableName,
                               action_filter: &SyncBufferFilter|
     -> Result<(), RepositoryError> {
        let per_table_filter = action_filter
            .clone()
            .table_name(EqualFilter::equal_to(table.to_string()));

        let rows = SyncBufferRepository::new(connection).query(Some(per_table_filter))?;

        let had_store_records = *table == ChangelogTableName::Store && !rows.is_empty();

        for row in &rows {
            match validate_translate_integrate_one(connection, row, &sync_context) {
                Ok(()) => write_sync_buffer_success(&row.record_id, connection)?,
                Err(e) => {
                    write_sync_buffer_error(&row.record_id, connection, &e)?;
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

    // Upserts: parents before children.
    let upsert_filter = filter.clone().action(SyncAction::Upsert.equal_to());
    for table in INTEGRATION_ORDER {
        integrate_table(table, &upsert_filter)?;
    }

    // Deletes: children before parents.
    let delete_filter = filter.clone().action(SyncAction::Delete.equal_to());
    for table in INTEGRATION_ORDER.iter().rev() {
        integrate_table(table, &delete_filter)?;
    }

    Ok(())
}
