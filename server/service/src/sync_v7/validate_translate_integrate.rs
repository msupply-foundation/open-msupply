use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{sync_logger::SyncLogger, write_sync_buffer_success},
};

use super::{validate::*, write_sync_buffer_error};
use serde::de::Error as _;
use repository::{
    dynamic_query::FilterBuilder,
    sync_buffer_v7::{self, Condition},
    syncv7::SyncType,
    ChangelogTableName, CurrencyRow, CurrencyRowRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, ItemRow, ItemRowRepository,
    LocationTypeRow, LocationTypeRowRepository, NameRow, NameRowRepository, RepositoryError,
    StockLineRow, StockLineRowRepository, StorageConnection, StoreRow, StoreRowRepository,
    SyncBufferV7Repository, SyncBufferV7Row, UnitRow, UnitRowRepository,
};
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
}

enum Row {
    Unit(UnitRow),
    Currency(CurrencyRow),
    Name(NameRow),
    Store(StoreRow),
    LocationType(LocationTypeRow),
    Item(ItemRow),
    StockLine(StockLineRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
}

fn translate(row: &SyncBufferV7Row) -> Result<Row, Error> {
    match row.table_name {
        ChangelogTableName::Unit => Ok(Row::Unit(row.deserialize()?)),
        ChangelogTableName::Currency => Ok(Row::Currency(row.deserialize()?)),
        ChangelogTableName::Name => Ok(Row::Name(row.deserialize()?)),
        ChangelogTableName::Store => Ok(Row::Store(row.deserialize()?)),
        ChangelogTableName::LocationType => Ok(Row::LocationType(row.deserialize()?)),
        ChangelogTableName::Item => Ok(Row::Item(row.deserialize()?)),
        ChangelogTableName::StockLine => Ok(Row::StockLine(row.deserialize()?)),
        ChangelogTableName::Invoice => Ok(Row::Invoice(row.deserialize()?)),
        ChangelogTableName::InvoiceLine => Ok(Row::InvoiceLine(row.deserialize()?)),
        _ => Err(Error::TranslationError(serde_json::Error::custom(format!(
            "No translator for table {:?}",
            row.table_name
        )))),
    }
}

fn sync_type(row: &Row) -> &'static SyncType {
    match row {
        Row::Unit(_)
        | Row::Currency(_)
        | Row::Name(_)
        | Row::Store(_)
        | Row::LocationType(_)
        | Row::Item(_) => &SyncType::Central,
        Row::StockLine(_) | Row::Invoice(_) | Row::InvoiceLine(_) => &SyncType::Remote,
    }
}

fn integrate(
    connection: &StorageConnection,
    row: Row,
    sync_buffer_row: &SyncBufferV7Row,
) -> Result<(), RepositoryError> {
    let extra = sync_buffer_row.clone().to_changelog_extra();
    match row {
        Row::Unit(r) => UnitRowRepository::new(connection).upsert_sync(&r, extra),
        Row::Currency(r) => CurrencyRowRepository::new(connection).upsert_sync(&r, extra),
        Row::Name(r) => NameRowRepository::new(connection).upsert_sync(&r, extra),
        Row::Store(r) => StoreRowRepository::new(connection).upsert_sync(&r, extra),
        Row::LocationType(r) => LocationTypeRowRepository::new(connection).upsert_sync(&r, extra),
        Row::Item(r) => ItemRowRepository::new(connection).upsert_sync(&r, extra),
        Row::StockLine(r) => StockLineRowRepository::new(connection).upsert_sync(&r, extra),
        Row::Invoice(r) => InvoiceRowRepository::new(connection).upsert_sync(&r, extra),
        Row::InvoiceLine(r) => InvoiceLineRowRepository::new(connection).upsert_sync(&r, extra),
    }
}

fn validate_translate_integrate_one(
    connection: &StorageConnection,
    row: &SyncBufferV7Row,
    sync_context: &SyncContext,
) -> Result<(), Error> {
    let translated = translate(row)?;
    let st = sync_type(&translated);

    match sync_context {
        SyncContext::Central { active_stores } => {
            validate_on_central(row, st, active_stores)?
        }
        SyncContext::Remote {
            is_initialising,
            active_stores,
        } => validate_on_remote(row, st, active_stores, *is_initialising)?,
    };

    integrate(connection, translated, row).map_err(Error::IntegrationError)?;

    Ok(())
}

// TODO transactions
pub fn validate_translate_integrate<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    sync_buffer_filter: Option<Condition::Inner>,
    sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    use sync_buffer_v7::Condition as C;

    // TODO this is too hacky, prefer active store cache
    let mut sync_context = sync_context;

    let filter = sync_buffer_filter
        .map(|f| C::And(vec![f, C::integration_datetime::is_null()]))
        .unwrap_or(C::integration_datetime::is_null());

    let mut total = SyncBufferV7Repository::new(connection).count(Some(filter.clone()))?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    let mut had_store_records = false;

    for row in SyncBufferV7Repository::new(connection).query(Some(filter.clone()))? {
        if row.table_name == ChangelogTableName::Store {
            had_store_records = true;
        }

        match validate_translate_integrate_one(connection, &row, &sync_context) {
            Ok(()) => write_sync_buffer_success(row, connection)?,
            Err(e) => {
                write_sync_buffer_error(row, connection, &e)?;
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

    // TODO this is too hacky and unwraps
    if had_store_records {
        if let SyncContext::Remote {
            is_initialising: _,
            active_stores,
        } = &mut sync_context
        {
            *active_stores = ActiveStoresOnSite::get(connection, None).unwrap();
        }
    }

    Ok(())
}
