use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{sync_logger::SyncLogger, write_sync_buffer_success},
};

use super::{validate::*, write_sync_buffer_error};
use repository::syncv7::INTEGRATION_ORDER;
use repository::{
    ChangeLogInsertRow, ChangelogTableName, CurrencyRow, DatetimeFilter, EqualFilter,
    InvoiceLineRow, InvoiceRow, ItemRow, LocationTypeRow, NameRow, RepositoryError, RowActionType,
    StockLineRow, StorageConnection, StoreRow, SyncBufferFilter, SyncBufferRepository,
    SyncBufferRow, UnitRow, Upsert,
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

fn translate(table_name: &ChangelogTableName, data: &str) -> Result<Box<dyn Upsert>, Error> {
    let upsert: Box<dyn Upsert> = match table_name {
        ChangelogTableName::Unit => Box::new(serde_json::from_str::<UnitRow>(data)?),
        ChangelogTableName::Currency => Box::new(serde_json::from_str::<CurrencyRow>(data)?),
        ChangelogTableName::Name => Box::new(serde_json::from_str::<NameRow>(data)?),
        ChangelogTableName::Store => Box::new(serde_json::from_str::<StoreRow>(data)?),
        ChangelogTableName::LocationType => {
            Box::new(serde_json::from_str::<LocationTypeRow>(data)?)
        }
        ChangelogTableName::Item => Box::new(serde_json::from_str::<ItemRow>(data)?),
        ChangelogTableName::StockLine => Box::new(serde_json::from_str::<StockLineRow>(data)?),
        ChangelogTableName::Invoice => Box::new(serde_json::from_str::<InvoiceRow>(data)?),
        ChangelogTableName::InvoiceLine => Box::new(serde_json::from_str::<InvoiceLineRow>(data)?),
        _ => {
            return Err(Error::TranslationError(serde_json::Error::custom(format!(
                "No translator for table {:?}",
                table_name
            ))))
        }
    };

    Ok(upsert)
}

fn integrate(
    connection: &StorageConnection,
    upsert: Box<dyn Upsert>,
    table_name: ChangelogTableName,
    row: &SyncBufferRow,
) -> Result<(), RepositoryError> {
    let changelog = ChangeLogInsertRow {
        table_name,
        record_id: row.record_id.clone(),
        row_action: RowActionType::Upsert,
        store_id: row.store_id.clone(),
        source_site_id: row.source_site_id,
        transfer_store_id: row.transfer_store_id.clone(),
        patient_id: row.patient_id.clone(),
        ..Default::default()
    };

    upsert.upsert_v7(connection, changelog)?;

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

    let translated = translate(&table_name, &row.data)?;

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

    let rows = SyncBufferRepository::new(connection).query(Some(filter.clone()))?;
    let mut total = rows.len() as i64;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut had_store_records = false;

    // Process tables in FK order so parents integrate before children.
    for table in INTEGRATION_ORDER {
        let per_table_filter = filter
            .clone()
            .table_name(EqualFilter::equal_to(table.to_string()));

        let rows = SyncBufferRepository::new(connection).query(Some(per_table_filter))?;

        if *table == ChangelogTableName::Store && !rows.is_empty() {
            had_store_records = true;
        }

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

        // Refresh active stores after the Store batch so downstream Remote
        // records validate against fresh state.
        if *table == ChangelogTableName::Store && had_store_records {
            if let SyncContext::Remote {
                is_initialising: _,
                active_stores,
            } = &mut sync_context
            {
                *active_stores = ActiveStoresOnSite::get(connection).unwrap();
            }
        }
    }

    Ok(())
}
