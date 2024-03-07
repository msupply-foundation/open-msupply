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
    fn table_name(&self) -> &'static str {
        "unit"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyUnitRow>(&sync_record.data)?;
        let mut result = UnitRow {
            id: data.ID,
            name: data.units,
            description: None,
            index: data.order_number,
            is_active: true,
        };

        if data.comment != "" {
            result.description = Some(data.comment);
        }

        Ok(PullTranslateResult::upsert(result))
    }

    // TODO soft delete
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
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
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
}
