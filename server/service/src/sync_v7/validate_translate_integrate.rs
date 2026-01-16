use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{sync_logger::SyncLogger, write_sync_buffer_success},
};

use super::{integrate::*, validate::*, write_sync_buffer_error};
use repository::{
    dynamic_query::FilterBuilder,
    sync_buffer_v7::{self, Condition},
    syncv7::{translators, BoxableSyncRecord},
    RepositoryError, StorageConnection, SyncBufferV7Repository, SyncBufferV7Row,
};
use thiserror::Error;

pub enum SyncContext {
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

fn validate_translate_integrate_single(
    connection: &StorageConnection,
    row: &SyncBufferV7Row,
    translator: &Box<dyn BoxableSyncRecord>,
    sync_context: &SyncContext,
) -> Result<(), Error> {
    let upsert = translator.deserialize(&row.data)?;

    match sync_context {
        SyncContext::Central { active_stores } => validate_on_central(row, &upsert, active_stores)?,
        SyncContext::Remote {
            is_initialising,
            active_stores,
        } => validate_on_remote(row, &upsert, active_stores, *is_initialising)?,
    };
    integrate(connection, &row, upsert).map_err(Error::IntegrationError)?;

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

    let filter = sync_buffer_filter
        .map(|f| C::And(vec![f, C::integration_datetime::is_null()]))
        .unwrap_or(C::integration_datetime::is_null());

    let mut total = SyncBufferV7Repository::new(connection).count(Some(filter.clone()))?;
    let mut last_progress = total / PROGRESS_INTERVAL;

    if let Some(logger) = logger.as_mut() {
        logger.progress(total)?;
    }

    for translator in translators() {
        let filter = C::And(vec![
            filter.clone(),
            C::table_name::equal(translator.table_name()),
        ]);

        for row in SyncBufferV7Repository::new(connection).query(Some(filter.clone()))? {
            match validate_translate_integrate_single(connection, &row, &translator, &sync_context)
            {
                Ok(()) => write_sync_buffer_success(row, connection)?,
                Err(e) => {
                    write_sync_buffer_error(row, connection, &e)?;
                }
            }
            total -= 1;

            if let Some(logger) = logger.as_mut() {
                if total / PROGRESS_INTERVAL <= last_progress {
                    logger.progress(total);
                    last_progress -= 1;
                }
            }
        }
    }

    Ok(())
}
