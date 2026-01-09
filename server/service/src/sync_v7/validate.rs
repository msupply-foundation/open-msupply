use repository::{
    syncv7::{SyncType, Upsert},
    SyncBufferV7Row,
};
use thiserror::Error;

use crate::sync::ActiveStoresOnSite;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Store is not active on site")]
    InactiveStore,
    #[error("Store is active but site already initialised")]
    SiteAlreadyInitialised,
    #[error("Name is not active, cannot be transfered")]
    InactiveName,
    #[error("No store id found on sync buffer row")]
    NoStoreId,
    #[error("Central records can only be edited on central")]
    CentralRecordEditsOnCentralOnly,
}

pub fn validate_on_remote(
    (sync_buffer_row, upsert): &(SyncBufferV7Row, Box<dyn Upsert>),
    active_on_site: &ActiveStoresOnSite,
    is_initialising: bool,
) -> Option<ValidationError> {
    match upsert.sync_type() {
        SyncType::Central => {}
        SyncType::Remote => {
            let Some(store_id) = sync_buffer_row.store_id.clone() else {
                return Some(ValidationError::NoStoreId);
            };
            let is_active_store = active_on_site.store_id_match(&store_id);
            let is_active_name = sync_buffer_row
                .name_id
                .clone()
                .map_or(false, |name_id| active_on_site.name_id_match(&name_id));
            // If name is active, it's transfer it's ok to integrate
            if is_active_name {
                return None;
            }

            // If name is not active then store must be active
            if !is_active_store {
                return Some(ValidationError::InactiveStore);
            }

            // If store is active, integrate only when initialising
            if !is_initialising {
                return Some(ValidationError::SiteAlreadyInitialised);
            }
        }
        SyncType::Name =>
            /* TODO is it central name or patient with name_store_join here */
            {}
    };

    None
}
pub fn validate_on_central(
    (sync_buffer_row, upsert): &(SyncBufferV7Row, Box<dyn Upsert>),
    active_on_site: &ActiveStoresOnSite,
) -> Option<ValidationError> {
    match upsert.sync_type() {
        SyncType::Central => return Some(ValidationError::CentralRecordEditsOnCentralOnly),
        SyncType::Remote => {
            let Some(store_id) = sync_buffer_row.store_id.clone() else {
                return Some(ValidationError::NoStoreId);
            };

            if !active_on_site.store_id_match(&store_id) {
                return Some(ValidationError::InactiveStore);
            }
        }
        SyncType::Name =>
            /* TODO don't allow central name changes only allow edits of patients from sites with name_store_join */
            {}
    };

    None
}
