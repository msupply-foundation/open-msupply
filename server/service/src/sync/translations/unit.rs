use repository::{StorageConnection, SyncBufferRow, UnitRow, UnitRowDelete};

use serde::Deserialize;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyUnitRow {
    ID: String,
    units: String,
    comment: String,
    order_number: i32,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(UnitTranslation)
}

pub(super) struct UnitTranslation;
impl SyncTranslation for UnitTranslation {
    fn table_name(&self) -> &str {
        "unit"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyUnitRow>()?;
        let mut result = UnitRow {
            id: data.ID,
            name: data.units,
            description: None,
            index: data.order_number,
            is_active: true,
        };

        if !data.comment.is_empty() {
            result.description = Some(data.comment);
        }

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(UnitRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_unit_translation() {
        use crate::sync::test::test_data::unit as test_data;
        let translator = UnitTranslation {};

        let (_, connection, _, _) =
            setup_all("test_unit_translation", MockDataInserts::none()).await;

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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// Translates a legacy unit and stores it as the integration step does.
    fn pull(connection: &StorageConnection, comment: &str) -> UnitRow {
        let incoming = SyncBufferRow {
            table_name: "unit".to_string(),
            record_id: "unit_a".to_string(),
            data: repository::SyncRecordData(serde_json::json!({
                "ID": "unit_a",
                "units": "Tab",
                "comment": comment,
                "order_number": 1,
            })),
            action: repository::SyncAction::Upsert,
            ..Default::default()
        };
        let PullTranslateResult::IntegrationOperations(operations) = UnitTranslation
            .try_translate_from_upsert_sync_record(
                connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming,
            )
            .unwrap()
        else {
            panic!("expected an upsert");
        };
        for operation in operations {
            let crate::sync::translations::IntegrationOperation::Upsert(upsert) = operation else {
                panic!("expected an upsert");
            };
            upsert
                .upsert_sync(
                    connection,
                    repository::ChangelogSyncType::SyncTypeV5V6 {
                        source_site_id: None,
                    },
                )
                .unwrap();
        }
        repository::UnitRowRepository::new(connection)
            .find_one_by_id("unit_a")
            .unwrap()
            .unwrap()
    }

    #[actix_rt::test]
    async fn an_empty_legacy_comment_clears_the_saved_description() {
        let (_, connection, _, _) = setup_all(
            "unit_translation_clears_description",
            MockDataInserts::none(),
        )
        .await;

        assert_eq!(
            pull(&connection, "Tablets").description,
            Some("Tablets".to_string())
        );
        assert_eq!(pull(&connection, "").description, None);
    }
}
