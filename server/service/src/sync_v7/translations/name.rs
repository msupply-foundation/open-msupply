use repository::{
    ChangeLogInsertRow, KeyType, KeyValueStoreRepository, NameRow, NameRowRepository, NameRowType,
    StorageConnection, Upsert, syncv7::SyncRecordSerializeError,
};

use crate::sync_v7::{serde::DeserializeResult, validate_translate_integrate::SyncContext};

// Keep a patient's deletion on central (#1494).
//
// A remote that hasn't received a patient's deletion yet can edit the patient
// and push the whole row with no `deleted_datetime`. On central the edit is
// applied but the deletion is kept: only OG says a patient isn't deleted (see
// the legacy name translator). Records central sends to a remote are applied as
// they are, so a patient OG restores reaches remotes.
//
// The kept row's changelog is stamped with OG's site id (this server's own if
// unset), not the pushing remote's: a remote never pulls its own rows and the
// changelog dedup keeps only the newest row per record, so a remote-stamped row
// could leave the editing remote without the deletion. An OG-stamped row also
// isn't pushed back to OG.
pub(crate) fn translate_name(
    connection: &StorageConnection,
    mut changelog_insert: ChangeLogInsertRow,
    data: &serde_json::Value,
    sync_context: &SyncContext,
) -> DeserializeResult {
    let mut row: NameRow = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    if matches!(sync_context, SyncContext::Central { .. })
        && row.r#type == NameRowType::Patient
        && row.deleted_datetime.is_none()
        && let Some(deleted_datetime) = NameRowRepository::new(connection)
            .find_one_by_id(&row.id)?
            .and_then(|existing| existing.deleted_datetime)
    {
        row.deleted_datetime = Some(deleted_datetime);

        let key_value_store = KeyValueStoreRepository::new(connection);
        changelog_insert.source_site_id =
            match key_value_store.get_i32(KeyType::SettingsSyncCentralServerSiteId)? {
                Some(legacy_central_site_id) => Some(legacy_central_site_id),
                None => key_value_store.get_current_site_id()?,
            };
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::ActiveStoresOnSite;
    use chrono::NaiveDate;
    use repository::{
        ChangelogSyncType, NameRowRepository, mock::MockDataInserts, test_db::setup_all,
    };

    const OG_SITE_ID: i32 = 1;
    const REMOTE_SITE_ID: i32 = 2;
    const CENTRAL_SITE_ID: i32 = 3;

    /// On central, a remote's push of a patient with no deletion keeps central's
    /// deletion and is stamped with OG's site id; anything else is integrated as
    /// it arrives (#1494)
    #[actix_rt::test]
    async fn translate_name_keeps_patient_deletion_on_central() {
        let (_, connection, _, _) = setup_all(
            "translate_name_keeps_patient_deletion_on_central",
            MockDataInserts::none().names(),
        )
        .await;
        let key_value_store = KeyValueStoreRepository::new(&connection);
        key_value_store
            .set_i32(KeyType::SettingsSyncCentralServerSiteId, Some(OG_SITE_ID))
            .unwrap();
        key_value_store
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();

        let central = SyncContext::Central {
            source_site_active_store_ids: vec![],
            is_multi_device: false,
        };
        let remote = SyncContext::Remote {
            is_initialising: false,
            active_stores: ActiveStoresOnSite::get(&connection).unwrap(),
            is_multi_device: false,
        };
        let name_repo = NameRowRepository::new(&connection);
        let deleted_at = NaiveDate::from_ymd_opt(2026, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();

        // Integrates `row` as pushed by the remote, returning the stored row and
        // the changelog's source site
        let integrate = |row: &NameRow, sync_context: &SyncContext| {
            let changelog = ChangeLogInsertRow {
                record_id: row.id.clone(),
                source_site_id: Some(REMOTE_SITE_ID),
                ..Default::default()
            };
            let mut result = translate_name(
                &connection,
                changelog,
                &serde_json::to_value(row).unwrap(),
                sync_context,
            )
            .unwrap();
            assert_eq!(result.len(), 1);
            let (upsert, changelog_row) = result.pop().unwrap();
            let source_site_id = changelog_row.source_site_id;
            upsert
                .upsert_sync(&connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
                .unwrap();
            (
                name_repo.find_one_by_id(&row.id).unwrap().unwrap(),
                source_site_id,
            )
        };

        let mut patient = name_repo.find_one_by_id("testId").unwrap().unwrap();
        let edit = NameRow {
            phone: Some("edited".to_string()),
            ..patient.clone()
        };

        // Not deleted on central: integrated as it arrives
        let (stored, source_site_id) = integrate(&edit, &central);
        assert_eq!(stored, edit);
        assert_eq!(source_site_id, Some(REMOTE_SITE_ID));

        // Deleted on central: the edit applies, the deletion stays, OG-stamped
        patient.deleted_datetime = Some(deleted_at);
        name_repo.upsert_one(&patient).unwrap();
        let (stored, source_site_id) = integrate(&edit, &central);
        assert_eq!(
            stored,
            NameRow {
                deleted_datetime: Some(deleted_at),
                ..edit.clone()
            }
        );
        assert_eq!(source_site_id, Some(OG_SITE_ID));

        // On a remote, central's record is integrated as it arrives
        name_repo.upsert_one(&patient).unwrap();
        let (stored, source_site_id) = integrate(&edit, &remote);
        assert_eq!(stored, edit);
        assert_eq!(source_site_id, Some(REMOTE_SITE_ID));

        // Other names aren't guarded
        let mut facility = name_repo.find_one_by_id("name_a").unwrap().unwrap();
        facility.deleted_datetime = Some(deleted_at);
        name_repo.upsert_one(&facility).unwrap();
        let facility_edit = NameRow {
            deleted_datetime: None,
            ..facility
        };
        let (stored, _) = integrate(&facility_edit, &central);
        assert_eq!(stored, facility_edit);
    }
}
