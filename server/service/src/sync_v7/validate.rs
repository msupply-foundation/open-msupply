use repository::{ChangeLogSyncStyle, SyncBufferRow};
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
    #[error("No patient id found on sync buffer row")]
    NoPatientId,
    #[error("Central records can only be edited on central")]
    CentralRecordEditsOnCentralOnly,
    #[error("Transfer store is not active on this site")]
    TransferStoreNotActiveOnThisSite,
    #[error("Sync style is not expected on a v7 sync path")]
    UnexpectedSyncStyleForV7,
}

pub(crate) fn validate_on_remote(
    sync_buffer_row: &SyncBufferRow,
    sync_styles: &[ChangeLogSyncStyle],
    active_on_site: &ActiveStoresOnSite,
    is_initialising: bool,
) -> Result<(), ValidationError> {
    use ChangeLogSyncStyle::*;
    let active_store_ids = active_on_site.store_ids();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        let result = match style {
            Central => match (&sync_buffer_row.store_id, &sync_buffer_row.patient_id) {
                (None, None) => Ok(()),
                _ => Err(ValidationError::UnexpectedSyncStyleForV7),
            },
            // Initialising sites only, store must be active.
            // TODO sync store data when site has changed
            Remote => match &sync_buffer_row.store_id {
                None => Err(ValidationError::NoStoreId),
                Some(id) if !active_store_ids.iter().any(|s| s == id) => {
                    Err(ValidationError::InactiveStore)
                }
                Some(_) if !is_initialising => Err(ValidationError::SiteAlreadyInitialised),
                Some(_) => Ok(()),
            },
            Transfer => match &sync_buffer_row.transfer_store_id {
                Some(id) if active_store_ids.iter().any(|s| s == id) => Ok(()),
                _ => Err(ValidationError::TransferStoreNotActiveOnThisSite),
            },
            // Sanity check for patient would require name_store_join visibility check.
            Patient => Ok(()),
            File => Ok(()),
            ToLegacyCentralOnly => Err(ValidationError::UnexpectedSyncStyleForV7),
            RemoteToCentral => Err(ValidationError::UnexpectedSyncStyleForV7),
        };

        match result {
            Ok(()) => return Ok(()),
            Err(e) => last_err = e,
        }
    }

    Err(last_err)
}

pub(crate) fn validate_on_central(
    sync_buffer_row: &SyncBufferRow,
    sync_styles: &[ChangeLogSyncStyle],
    // Central's own active stores, not the source site's. Currently unused;
    active_on_site: &ActiveStoresOnSite,
) -> Result<(), ValidationError> {
    use ChangeLogSyncStyle::*;
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        let result = match style {
            Central => Err(ValidationError::UnexpectedSyncStyleForV7),
            // Remote store validation is via auth
            Remote | RemoteToCentral => match &sync_buffer_row.store_id {
                Some(_) => Ok(()),
                None => Err(ValidationError::NoStoreId),
            },
            Transfer => Ok(()),
            // TODO don't allow central name changes only allow edits of patients from sites with name_store_join
            Patient => match &sync_buffer_row.patient_id {
                Some(_) => Ok(()),
                None => Err(ValidationError::NoPatientId),
            },
            File => Ok(()),
            ToLegacyCentralOnly => Err(ValidationError::UnexpectedSyncStyleForV7),
        };

        match result {
            Ok(()) => return Ok(()),
            Err(e) => last_err = e,
        }
    }

    Err(last_err)
}
