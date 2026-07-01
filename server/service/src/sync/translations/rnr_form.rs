use repository::{
    rnr_form_row::RnRFormRow,
    ChangelogRow, ChangelogTableName, RnRFormDelete, Row, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
    program_requisition_settings::ProgramRequisitionSettingsTranslation,
    requisition::RequisitionTranslation, store::StoreTranslation,
};

use super::{
    utils::{from_renamed_keys_str, to_renamed_keys_value, RenamedKeys},
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

/// FK column renamed during the name_link abstraction. Central emits both the canonical
/// `name_id` and the legacy `name_link_id` alias and accepts either, for cross-version sync.
/// See `RenamedKeys`. Each pair is `(canonical, legacy_alias)`.
const RENAMED_KEYS: RenamedKeys = &[("name_id", "name_link_id")];

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RnRFormTranslation)
}

pub(crate) struct RnRFormTranslation;

impl SyncTranslation for RnRFormTranslation {
    fn table_name(&self) -> &'static str {
        "rnr_form"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            MasterListTranslation.table_name(),
            ProgramRequisitionSettingsTranslation.table_name(),
            PeriodTranslation.table_name(),
            StoreTranslation.table_name(),
            NameTranslation.table_name(),
            RequisitionTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row =
            from_renamed_keys_str::<RnRFormRow>(&sync_record.data.0.to_string(), RENAMED_KEYS)?;
        Ok(PullTranslateResult::upsert(row))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::RnrForm)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::RnrForm(rnr_form_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = rnr_form_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            to_renamed_keys_value(&row, RENAMED_KEYS)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(RnRFormDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_rnr_form_translation() {
        use crate::sync::test::test_data::rnr_form as test_data;
        let translator = RnRFormTranslation;

        let (_, connection, _, _) =
            setup_all("test_rnr_form_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// Central serialises `RnRFormRow` for the v6 wire. After the name_link rename the
    /// canonical field is `name_id`; central must still emit the legacy `name_link_id` alias
    /// and accept either name on the way back in (see `RenamedKeys` for the version details).
    #[test]
    fn test_wire_format_keeps_both_link_id_names() {
        let row = RnRFormRow {
            name_id: "test_name".to_string(),
            ..Default::default()
        };

        let json = to_renamed_keys_value(&row, RENAMED_KEYS).unwrap();
        assert_eq!(json["name_id"], "test_name");
        assert_eq!(json["name_link_id"], "test_name");

        // Records carrying both keys round-trip.
        let parsed: RnRFormRow = from_renamed_keys_str(&json.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);

        // A <= v2.16 remote sends only the legacy `name_link_id`; it is promoted.
        let mut legacy_only = json.clone();
        let object = legacy_only.as_object_mut().unwrap();
        for (canonical_key, _) in RENAMED_KEYS {
            object.remove(*canonical_key);
        }
        let parsed: RnRFormRow =
            from_renamed_keys_str(&legacy_only.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);
    }
}
