use repository::{
    rnr_form_line_row::RnRFormLineRow, ChangelogRow, ChangelogTableName, RnRFormLineDelete, Row,
    StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    item::ItemTranslation, requisition_line::RequisitionLineTranslation,
    rnr_form::RnRFormTranslation,
};

use super::{
<<<<<<< HEAD
    utils::{from_renamed_keys_str, to_renamed_keys_value, RenamedKeys},
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

/// FK column renamed during the entity-link abstraction. Central emits both the canonical
/// `item_id` and the legacy `item_link_id` alias and accepts either, for cross-version sync.
/// See `RenamedKeys`. Each pair is `(canonical, legacy_alias)`.
const RENAMED_KEYS: RenamedKeys = &[("item_id", "item_link_id")];
=======
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};
>>>>>>> 8c6410ebb5 (All fks checked)

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RnRFormLineTranslation)
}

pub(crate) struct RnRFormLineTranslation;

impl SyncTranslation for RnRFormLineTranslation {
    fn table_name(&self) -> &'static str {
        "rnr_form_line"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            RnRFormTranslation.table_name(),
            ItemTranslation.table_name(),
            RequisitionLineTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
<<<<<<< HEAD
        let row = from_renamed_keys_str::<RnRFormLineRow>(
            &sync_record.data.0.to_string(),
            RENAMED_KEYS,
        )?;
        Ok(PullTranslateResult::upsert(row))
=======
        let row = serde_json::from_value::<RnRFormLineRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "rnr_form_line", &row.id);

        let result = RnRFormLineRow {
            rnr_form_id: check_fk(row.rnr_form_id, "rnr_form_id", FkField::RnrForm)?,
            item_link_id: check_fk(row.item_link_id, "item_link_id", FkField::ItemLink)?,
            ..row
        };

        Ok(PullTranslateResult::upsert(result))
>>>>>>> 8c6410ebb5 (All fks checked)
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::RnrFormLine)
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
        let Row::RnrFormLine(rnr_form_line_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

<<<<<<< HEAD
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            to_renamed_keys_value(&rnr_form_line_row, RENAMED_KEYS)?,
=======
        let row = rnr_form_line_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
>>>>>>> 8c6410ebb5 (All fks checked)
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(RnRFormLineDelete(
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
        use crate::sync::test::test_data::rnr_form_line as test_data;
        let translator = RnRFormLineTranslation;

        let (_, connection, _, _) =
            setup_all("test_rnr_form_line_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// Central serialises `RnRFormLineRow` for the v6 wire. After the entity-link rename the
    /// canonical field is `item_id`; central must still emit the legacy `item_link_id` alias
    /// and accept either name on the way back in (see `RenamedKeys` for the version details).
    #[test]
    fn test_wire_format_keeps_both_link_id_names() {
        let row = RnRFormLineRow {
            item_id: "test_item".to_string(),
            ..Default::default()
        };

        let json = to_renamed_keys_value(&row, RENAMED_KEYS).unwrap();
        assert_eq!(json["item_id"], "test_item");
        assert_eq!(json["item_link_id"], "test_item");

        // Records carrying both keys round-trip.
        let parsed: RnRFormLineRow =
            from_renamed_keys_str(&json.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);

        // A <= v2.16 remote sends only the legacy `item_link_id`; it is promoted.
        let mut legacy_only = json.clone();
        let object = legacy_only.as_object_mut().unwrap();
        for (canonical_key, _) in RENAMED_KEYS {
            object.remove(*canonical_key);
        }
        let parsed: RnRFormLineRow =
            from_renamed_keys_str(&legacy_only.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);
    }
}
