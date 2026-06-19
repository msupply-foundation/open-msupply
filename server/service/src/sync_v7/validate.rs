use repository::{Authoring, ChangelogTableName, SyncBufferRow};
use thiserror::Error;

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
    #[error("Store is not active on the source site")]
    StoreNotActiveOnSourceSite,
}

pub(crate) fn validate_on_remote(
    sync_buffer_row: &SyncBufferRow,
    table_name: &ChangelogTableName,
    active_on_site: &ActiveStoresOnSite,
    is_initialising: bool,
) -> Result<(), ValidationError> {
    use Authoring::*;
    let sync_style = table_name.sync_style();

    let active_store_ids = active_on_site.store_ids();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    for style in &sync_style.authoring {
        match style {
            // Reject rows that have a store id or patient id - these are remote or patient data, not central
            Central => match (&sync_buffer_row.store_id, &sync_buffer_row.patient_id) {
                (None, None) => return Ok(()),
                _ => last_err = ValidationError::UnexpectedSyncStyleForV7,
            },
            // Central stores may also edit these, so accept post-initialisation pushes.
            Remote => match &sync_buffer_row.store_id {
                None => last_err = ValidationError::NoStoreId,
                Some(id) if !active_store_ids.iter().any(|s| s == id) => {
                    last_err = ValidationError::InactiveStore
                }
                Some(_) => return Ok(()),
            },
            // Post-initialisation, any row for our own store is a stale echo — reject.
            RemoteOwned => match &sync_buffer_row.store_id {
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
            Anyone => return Ok(()),
            LegacyOnly => last_err = ValidationError::UnexpectedSyncStyleForV7,
        }
    }

    Err(last_err)
}

pub(crate) fn validate_on_central(
    sync_buffer_row: &SyncBufferRow,
    table_name: &ChangelogTableName,
    source_site_active_store_ids: &[String],
) -> Result<(), ValidationError> {
    use Authoring::*;
    let sync_style = table_name.sync_style();
    let mut last_err = ValidationError::UnexpectedSyncStyleForV7;

    let store_active_on_source = |id: &String| source_site_active_store_ids.iter().any(|s| s == id);

    for style in &sync_style.authoring {
        match style {
            Central => last_err = ValidationError::CentralOnlyEditableByCentral,
            // Accept only if the row's store belongs to the source site —
            // this also rejects rows referencing central's own stores.
            Remote | RemoteOwned | Transfer => match &sync_buffer_row.store_id {
                None => last_err = ValidationError::NoStoreId,
                Some(id) if store_active_on_source(id) => return Ok(()),
                Some(_) => last_err = ValidationError::StoreNotActiveOnSourceSite,
            },
            Patient => match (&sync_buffer_row.patient_id, &sync_buffer_row.store_id) {
                (None, _) => last_err = ValidationError::NoPatientId,
                (Some(_), None) => return Ok(()),
                (Some(_), Some(id)) if store_active_on_source(id) => return Ok(()),
                (Some(_), Some(_)) => last_err = ValidationError::StoreNotActiveOnSourceSite,
            },
            Anyone => return Ok(()),
            LegacyOnly => last_err = ValidationError::UnexpectedSyncStyleForV7,
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

        // Sync style: RemoteOwned — store must be active; post-initialisation, own echoes are rejected.
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

        // Sync style: Remote — post-initialisation pushes for our own store are accepted.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &NameStoreJoin,
                &site(),
                false,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    store_id: Some("inactive_store".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &NameStoreJoin,
                &site(),
                false,
            ),
            Err(ValidationError::InactiveStore)
        );
        // A row with no store_id can't be routed to an owner.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &NameStoreJoin,
                &site(),
                false,
            ),
            Err(ValidationError::NoStoreId)
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

        // Sync style: NotDistributed — never routed to a remote, always rejected.
        assert_eq!(
            validate_on_remote(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Site,
                &site(),
                false,
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );
    }

    #[test]
    fn on_central() {
        // Site 1 is central. Source site 2 has one store, "remote_store_a";
        // central also hosts "store_a" (via `site()`).
        let source_site_stores = vec!["remote_store_a".to_string()];

        // Sync style: Central — central data isn't edited on remotes, always rejected.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Item,
                &source_site_stores,
            ),
            Err(ValidationError::CentralOnlyEditableByCentral)
        );

        // Sync style: Remote — store_id must be active on the source site.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    store_id: Some("remote_store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &source_site_stores,
            ),
            Ok(())
        );
        // Central's own store referenced from a remote → reject.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &source_site_stores,
            ),
            Err(ValidationError::StoreNotActiveOnSourceSite)
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    store_id: Some("unknown_store".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &source_site_stores,
            ),
            Err(ValidationError::StoreNotActiveOnSourceSite)
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Stocktake,
                &source_site_stores,
            ),
            Err(ValidationError::NoStoreId)
        );

        // Sync style: Remote+Transfer (Requisition) — transfer_store_id
        // is not accepted as a store_id
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    transfer_store_id: Some("remote_store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Requisition,
                &source_site_stores,
            ),
            Err(ValidationError::NoStoreId)
        );

        // Sync style: Patient — patient_id must be present; if store_id is set,
        // it must belong to the source site.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
                &source_site_stores,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    store_id: Some("remote_store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
                &source_site_stores,
            ),
            Ok(())
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    patient_id: Some("patient_a".into()),
                    store_id: Some("store_a".into()),
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
                &source_site_stores,
            ),
            Err(ValidationError::StoreNotActiveOnSourceSite)
        );
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Document,
                &source_site_stores,
            ),
            Err(ValidationError::NoPatientId)
        );

        // Sync style: Anyone — central accepts the push as-is, no checks.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Clinician,
                &source_site_stores,
            ),
            Ok(())
        );

        // Sync style: LegacyOnly — not a v7 record, always rejected.
        assert_eq!(
            validate_on_central(
                &SyncBufferRow {
                    source_site_id: 2,
                    ..Default::default()
                },
                &Site,
                &source_site_stores,
            ),
            Err(ValidationError::UnexpectedSyncStyleForV7)
        );
    }
}
