use repository::{ChangeLogSyncStyle, ChangelogTableName, SyncBufferRow};
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
    #[error("Central data is only editable by the central site")]
    CentralOnlyEditableByCentral,
}

pub(crate) fn validate_on_remote(
    sync_buffer_row: &SyncBufferRow,
    table_name: &ChangelogTableName,
    active_on_site: &ActiveStoresOnSite,
    is_initialising: bool,
) -> Result<(), ValidationError> {
    let (sync_styles, _) = table_name.sync_style();

    let active_store_ids = active_on_site.store_ids();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        match style {
            // Reject rows that have a store id or patient id - these are remote or patient data, not central
            Central => match (&sync_buffer_row.store_id, &sync_buffer_row.patient_id) {
                (None, None) => return Ok(()),
                _ => last_err = ValidationError::UnexpectedSyncStyleForV7,
            },
            Remote => match &sync_buffer_row.store_id {
                None => last_err = ValidationError::NoStoreId,
                Some(id) if !active_store_ids.iter().any(|s| s == id) => {
                    last_err = ValidationError::InactiveStore
                }
                // Must follow the active-store check — store is ours here.
                Some(_) if !is_initialising => last_err = ValidationError::SiteAlreadyInitialised,
                Some(_) => return Ok(()),
            },
            Transfer => match &sync_buffer_row.transfer_store_id {
                Some(id) if active_store_ids.iter().any(|s| s == id) => return Ok(()),
                _ => last_err = ValidationError::TransferStoreNotActiveOnThisSite,
            },
            // Visibility already gated by the central pull filter.
            Patient => match &sync_buffer_row.patient_id {
                Some(_) => return Ok(()),
                None => last_err = ValidationError::NoPatientId,
            },
            File => return Ok(()),
            ToLegacyCentralOnly => last_err = ValidationError::UnexpectedSyncStyleForV7,
            RemoteToCentral => last_err = ValidationError::UnexpectedSyncStyleForV7,
        }
    }

    Err(last_err)
}

pub(crate) fn validate_on_central(
    sync_buffer_row: &SyncBufferRow,
    table_name: &ChangelogTableName,
    // Central's own active stores, currently unused.
    // kept for future (store merge?).
    _active_on_site: &ActiveStoresOnSite,
) -> Result<(), ValidationError> {
    let (sync_styles, _) = table_name.sync_style();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in sync_styles {
        match style {
            Central => last_err = ValidationError::CentralOnlyEditableByCentral,
            // Source site identity gated by auth.
            Remote => match &sync_buffer_row.store_id {
                Some(_) => return Ok(()),
                None => last_err = ValidationError::NoStoreId,
            },
            Transfer => return Ok(()),
            Patient => match &sync_buffer_row.patient_id {
                Some(_) => return Ok(()),
                None => last_err = ValidationError::NoPatientId,
            },
            File => return Ok(()),
            ToLegacyCentralOnly => last_err = ValidationError::UnexpectedSyncStyleForV7,
            RemoteToCentral => return Ok(()),
        }
    }

    Err(last_err)
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{NameRow, Store, StoreRow};
    use ChangelogTableName::*;

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
        // Sync style: Central — accepts only when the row has no routing metadata.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Item,
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
                &Item,
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
                &Item,
                &site(),
                false,
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );

        // Sync style: Remote — store must be active; post-init, own echoes are rejected.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &site(),
                true,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
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
                &Stocktake,
                &site(),
                true,
            ),
            Err(ValidationError::InactiveStore)
        );
        // Post-initialisation, reject a record for one of our own stores
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &site(),
                false,
            ),
            Err(ValidationError::SiteAlreadyInitialised)
        );

        // Sync style: Transfer — transfer_store must be active.
        // (Requisition's styles are Remote+Transfer; the Remote arm rejects
        // with NoStoreId, but Transfer accepts.)
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    transfer_store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Requisition,
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
                &Requisition,
                &site(),
                false,
            ),
            Err(ValidationError::TransferStoreNotActiveOnThisSite)
        );

        // Sync style: Patient — patient_id must be present.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
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
                &Document,
                &site(),
                false,
            ),
            Err(ValidationError::NoPatientId)
        );
    }

    #[test]
    fn on_central() {
        // Sync style: Central — central data isn't edited on remotes, always rejected.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Item,
                &site(),
            ),
            Err(ValidationError::CentralOnlyEditableByCentral)
        );

        // Sync style: Remote — store_id must be present (source site verified by auth).
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
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
                &Stocktake,
                &site(),
            ),
            Err(ValidationError::NoStoreId)
        );

        // Sync style: Transfer — accepted (source site trusted via auth).
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Requisition,
                &site(),
            ),
            Ok(())
        );

        // Sync style: Patient — patient_id must be present.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
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
                &Document,
                &site(),
            ),
            Err(ValidationError::NoPatientId)
        );
    }
}
