use crate::{
    sync::ActiveStoresOnSite,
    sync_v7::{sync_logger::SyncLogger, write_sync_buffer_success},
};

use super::{integrate::*, translate::*, validate::*, write_sync_buffer_error};
use repository::{
    sync_buffer_v7::Condition, RepositoryError, StorageConnection, SyncBufferV7Repository,
};

pub enum SyncContext {
    Central {
        active_stores: ActiveStoresOnSite,
    },
    Remote {
        is_initialising: bool,
        active_stores: ActiveStoresOnSite,
    },
}

static PROGRESS_INTERVAL: usize = 1000;

// TODO transactions
pub fn translate_validate_integrate<'a>(
    connection: &StorageConnection,
    mut logger: Option<&mut SyncLogger<'a>>,
    sync_buffer_filter: Option<Condition::Inner>,
    sync_context: SyncContext,
) -> Result<(), RepositoryError> {
    let sync_buffer_rows = SyncBufferV7Repository::new(connection).query(sync_buffer_filter)?;

    let mut to_validate_and_integrate = Vec::new();
    for row in sync_buffer_rows {
        match translate(&row) {
            Ok(upsert) => {
                to_validate_and_integrate.push((row, upsert));
            }
            Err(e) => {
                write_sync_buffer_error(row, connection, &e)?;
            }
        }
    }

    let mut integrations = Vec::new();

    for row in to_validate_and_integrate {
        let validation_error = match &sync_context {
            SyncContext::Central { active_stores } => validate_on_central(&row, active_stores),
            SyncContext::Remote {
                is_initialising,
                active_stores,
            } => validate_on_remote(&row, active_stores, *is_initialising),
        };

        if let Some(validation_error) = validation_error {
            write_sync_buffer_error(row.0, connection, &validation_error)?;
            continue;
        };

        integrations.push(row);
    }

    let relations = RelationsOrder::new();
    integrations.sort_by(|a, b| relations.sort(&a.0.table_name, &b.0.table_name));

    let mut last_progress = 0;
    if let Some(logger) = logger.as_mut() {
        logger.progress(integrations.len() as i64);
    }

    for (index, (sync_buffer_row, upsert)) in integrations.into_iter().enumerate() {
        match integrate(connection, &sync_buffer_row, upsert) {
            Ok(_) => write_sync_buffer_success(sync_buffer_row, connection)?,
            Err(e) => write_sync_buffer_error(sync_buffer_row, connection, &e)?,
        }

        if let Some(logger) = logger.as_mut() {
            if index / PROGRESS_INTERVAL >= last_progress {
                logger.progress(index as i64);
                last_progress += 1;
            }
        }
    }

    Ok(())
}
