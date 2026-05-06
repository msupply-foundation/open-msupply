use repository::{ChangeLogSyncStyle, SyncBufferRow};
use thiserror::Error;
use ChangeLogSyncStyle::*;

use crate::sync::ActiveStoresOnSite;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ValidationError {
    #[error("Store is not active on site")]
    InactiveStore,
    #[error("Store is active but site already initialised")]
    SiteAlreadyInitialised,
    #[error("No store id found on sync buffer row")]
    NoStoreId,
    #[error("No patient id found on sync buffer row")]
    NoPatientId,
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
    let active_store_ids = active_on_site.store_ids();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        let result = match style {
            Central => match (&sync_buffer_row.store_id, &sync_buffer_row.patient_id) {
                (None, None) => Ok(()),
                _ => Err(ValidationError::UnexpectedSyncStyleForV7),
            },
            // Store active on this site; post-init, reject own echoes only.
            Remote => match &sync_buffer_row.store_id {
                None => Err(ValidationError::NoStoreId),
                Some(id) if !active_store_ids.iter().any(|s| s == id) => {
                    Err(ValidationError::InactiveStore)
                }
                Some(_)
                    if !is_initialising
                        && sync_buffer_row.source_site_id == active_on_site.site_id() =>
                {
                    Err(ValidationError::SiteAlreadyInitialised)
                }
                Some(_) => Ok(()),
            },
            Transfer => match &sync_buffer_row.transfer_store_id {
                Some(id) if active_store_ids.iter().any(|s| s == id) => Ok(()),
                _ => Err(ValidationError::TransferStoreNotActiveOnThisSite),
            },
            // Visibility already gated by the central pull filter.
            Patient => match &sync_buffer_row.patient_id {
                Some(_) => Ok(()),
                None => Err(ValidationError::NoPatientId),
            },
            File => match (&sync_buffer_row.store_id, &sync_buffer_row.patient_id) {
                (None, None) => Ok(()),
                _ => Err(ValidationError::UnexpectedSyncStyleForV7),
            },
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
    // Central's own active stores, currently unused.
    // kept for future (store merge?).
    _active_on_site: &ActiveStoresOnSite,
) -> Result<(), ValidationError> {
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        let result = match style {
            Central => Err(ValidationError::UnexpectedSyncStyleForV7),
            // Source site identity gated by auth.
            Remote | RemoteToCentral => match &sync_buffer_row.store_id {
                Some(_) => Ok(()),
                None => Err(ValidationError::NoStoreId),
            },
            Transfer => Ok(()),
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{NameRow, Store, StoreRow};

    // Site 1 is "this site" with one active store, "store_a".
    // Site 2 is some other site.
    fn site() -> ActiveStoresOnSite {
        ActiveStoresOnSite {
            site_id: 1,
            stores: vec![Store {
                store_row: StoreRow {
                    id: "store_a".into(),
                    ..Default::default()
                },
                name_row: NameRow::default(),
            }],
        }
    }

    #[test]
    fn on_remote() {
        // CENTRAL — accepts only when the row has no routing metadata.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Central],
                &site(),
                false,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Central],
                &site(),
                false,
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Central],
                &site(),
                false,
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );

        // REMOTE — store must be active; post-init, own echoes are rejected.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
                true,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
                false,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
                true,
            ),
            Err(ValidationError::NoStoreId)
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("inactive_store".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
                true,
            ),
            Err(ValidationError::InactiveStore)
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 1,
                    ..Default::default()
                },
                &[Remote],
                &site(),
                false,
            ),
            Err(ValidationError::SiteAlreadyInitialised)
        );

        // TRANSFER — transfer_store must be active.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    transfer_store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Transfer],
                &site(),
                false,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    transfer_store_id: Some("inactive_store".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Transfer],
                &site(),
                false,
            ),
            Err(ValidationError::TransferStoreNotActiveOnThisSite)
        );

        // PATIENT — patient_id must be present.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Patient],
                &site(),
                false,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Patient],
                &site(),
                false,
            ),
            Err(ValidationError::NoPatientId)
        );
    }

    #[test]
    fn on_central() {
        // CENTRAL — central data isn't edited on remotes, always rejected.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Central],
                &site(),
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );

        // REMOTE — store_id must be present (source site verified by auth).
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Remote],
                &site(),
            ),
            Err(ValidationError::NoStoreId)
        );

        // TRANSFER — accepted (source site trusted via auth).
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Transfer],
                &site(),
            ),
            Ok(())
        );

        // PATIENT — patient_id must be present.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Patient],
                &site(),
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &[Patient],
                &site(),
            ),
            Err(ValidationError::NoPatientId)
        );
    }
}
