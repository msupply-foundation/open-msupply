use repository::SyncBufferRow;
use thiserror::Error;

use crate::sync::ActiveStoresOnSite;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Store is not active on site")]
    InactiveStore,
    #[error("Store is active but site already initialised")]
    SiteAlreadyInitialised,
    #[error("No store id found on sync buffer row")]
    NoStoreId,
    #[error("Central records can only be edited on central")]
    CentralRecordEditsOnCentralOnly,
}

/// Whether a record is central data or remote (store-specific) data
pub(crate) enum SyncType {
    Central,
    Remote,
}

pub(crate) fn validate_on_remote(
    sync_buffer_row: &SyncBufferRow,
    sync_type: &SyncType,
    active_on_site: &ActiveStoresOnSite,
    is_initialising: bool,
) -> Result<(), ValidationError> {
    match sync_type {
        SyncType::Central => {}
        SyncType::Remote => {
            let Some(store_id) = sync_buffer_row.store_id.as_ref() else {
                return Err(ValidationError::NoStoreId);
            };

            let store_ids = active_on_site.store_ids();
            let is_active_store = store_ids.iter().any(|id| id == store_id);

            if !is_active_store {
                return Err(ValidationError::InactiveStore);
            }

            // If store is active, integrate only when initialising
            if !is_initialising {
                return Err(ValidationError::SiteAlreadyInitialised);
            }
        }
    };

    Ok(())
}

pub(crate) fn validate_on_central(
    sync_buffer_row: &SyncBufferRow,
    sync_type: &SyncType,
    active_on_site: &ActiveStoresOnSite,
) -> Result<(), ValidationError> {
    match sync_type {
        SyncType::Central => return Err(ValidationError::CentralRecordEditsOnCentralOnly),
        SyncType::Remote => {
            let Some(store_id) = sync_buffer_row.store_id.as_ref() else {
                return Err(ValidationError::NoStoreId);
            };

            let store_ids = active_on_site.store_ids();
            if !store_ids.iter().any(|id| id == store_id) {
                return Err(ValidationError::InactiveStore);
            }
        }
    };

    Ok(())
}
