use repository::{
    vaccine_course::vaccine_course_item_row::{
        VaccineCourseItemRow, VaccineCourseItemRowRepository,
    },
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{item::ItemTranslation, vaccine_course::VaccineCourseTranslation};

use super::{
    utils::{from_renamed_keys_str, to_renamed_keys_value, RenamedKeys},
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

/// FK column renamed during the entity-link abstraction. Central emits both the canonical
/// `item_id` and the legacy `item_link_id` alias and accepts either, for cross-version sync.
/// See `RenamedKeys`. Each pair is `(canonical, legacy_alias)`.
const RENAMED_KEYS: RenamedKeys = &[("item_id", "item_link_id")];

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseItemTranslation)
}

pub(crate) struct VaccineCourseItemTranslation;

impl SyncTranslation for VaccineCourseItemTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_item"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            VaccineCourseTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = from_renamed_keys_str::<VaccineCourseItemRow>(&sync_record.data, RENAMED_KEYS)?;
        Ok(PullTranslateResult::upsert(row))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseItem)
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
                // We shouldn't ever create Vaccine Course item rows in the central server,
                // so we don't translate this, even when changelog records might exist
                // This can happen due to migrations that recreate change log rows
                false
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = VaccineCourseItemRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "VaccineCourseItem row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            to_renamed_keys_value(&row, RENAMED_KEYS)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_vaccine_course_item_translation() {
        use crate::sync::test::test_data::vaccine_course_item as test_data;
        let translator = VaccineCourseItemTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_item_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// Central serialises `VaccineCourseItemRow` for the v6 wire. Push is currently gated
    /// off (`should_translate_to_sync_record` returns false for `PushToOmSupplyCentral`),
    /// but this test guards the wire format: central must emit *both* the legacy
    /// `item_link_id` alias (for <= v2.16 remotes; v2.17 - v2.19 read the canonical `item_id`,
    /// v2.20+ read both), and accept either name on the way back in (see `RenamedKeys`).
    #[test]
    fn test_wire_format_keeps_both_link_id_names() {
        let row = VaccineCourseItemRow {
            item_id: "test_item".to_string(),
            ..Default::default()
        };

        let json = to_renamed_keys_value(&row, RENAMED_KEYS).unwrap();
        assert_eq!(json["item_id"], "test_item");
        assert_eq!(json["item_link_id"], "test_item");

        // Records carrying both keys round-trip.
        let parsed: VaccineCourseItemRow =
            from_renamed_keys_str(&json.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);

        // A <= v2.16 remote sends only the legacy `item_link_id`; it is promoted.
        let mut legacy_only = json.clone();
        let object = legacy_only.as_object_mut().unwrap();
        for (canonical_key, _) in RENAMED_KEYS {
            object.remove(*canonical_key);
        }
        let parsed: VaccineCourseItemRow =
            from_renamed_keys_str(&legacy_only.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);
    }
}
