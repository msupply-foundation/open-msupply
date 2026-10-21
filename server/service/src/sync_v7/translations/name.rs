use repository::{
    ChangeLogInsertRow, NameRow, NameRowRepository, NameRowType, StorageConnection, Upsert,
    syncv7::SyncRecordSerializeError,
};

use crate::sync_v7::{serde::DeserializeResult, validate_translate_integrate::SyncContext};

// On central, a remote that hasn't received a patient's deletion can push an
// edit with no `deleted_datetime`. The edit applies but the deletion is kept:
// only OG says a patient isn't deleted (see the legacy name translator). Central
// only, so a patient OG restores reaches remotes.
pub(crate) fn translate_name(
    connection: &StorageConnection,
    changelog_insert: ChangeLogInsertRow,
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
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::ActiveStoresOnSite;
    use chrono::NaiveDate;
    use repository::{
        ChangelogSyncType, KeyType, KeyValueStoreRepository, NameRowRepository,
        mock::MockDataInserts, test_db::setup_all,
    };

    /// On central, a remote's push of a patient with no deletion keeps central's
    /// deletion; anything else is integrated as it arrives
    #[actix_rt::test]
    async fn translate_name_keeps_patient_deletion_on_central() {
        let (_, connection, _, _) = setup_all(
            "translate_name_keeps_patient_deletion_on_central",
            MockDataInserts::none().names(),
        )
        .await;
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(1))
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

        // Integrates `row` in `sync_context`, returning the stored row
        let integrate = |row: &NameRow, sync_context: &SyncContext| {
            let changelog = ChangeLogInsertRow {
                record_id: row.id.clone(),
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
            upsert
                .upsert_sync(&connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
                .unwrap();
            name_repo.find_one_by_id(&row.id).unwrap().unwrap()
        };

        let mut patient = name_repo.find_one_by_id("testId").unwrap().unwrap();
        let edit = NameRow {
            phone: Some("edited".to_string()),
            ..patient.clone()
        };

        // Not deleted on central: integrated as it arrives
        assert_eq!(integrate(&edit, &central), edit);

        // Deleted on central: the edit applies, the deletion stays
        patient.deleted_datetime = Some(deleted_at);
        name_repo.upsert_one(&patient).unwrap();
        assert_eq!(
            integrate(&edit, &central),
            NameRow {
                deleted_datetime: Some(deleted_at),
                ..edit.clone()
            }
        );

        // On a remote, central's record is integrated as it arrives
        name_repo.upsert_one(&patient).unwrap();
        assert_eq!(integrate(&edit, &remote), edit);

        // Other names aren't guarded
        let mut facility = name_repo.find_one_by_id("name_a").unwrap().unwrap();
        facility.deleted_datetime = Some(deleted_at);
        name_repo.upsert_one(&facility).unwrap();
        let facility_edit = NameRow {
            deleted_datetime: None,
            ..facility
        };
        assert_eq!(integrate(&facility_edit, &central), facility_edit);
    }
}
