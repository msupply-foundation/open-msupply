use crate::sync::sync_serde::empty_str_as_option_string;
use repository::{
    vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowDelete},
    StorageConnection, SyncBufferRow,
};
use serde::Deserialize;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyVVMStatusRow {
    ID: String,
    description: String,
    code: String,
    level: i32,
    is_active: bool,
    #[serde(default)]
    unusable: bool,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    option_id: Option<String>,
}

// Needs to be added to all_translators()
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VVMStatusTranslation)
}

pub(super) struct VVMStatusTranslation;
impl SyncTranslation for VVMStatusTranslation {
    fn table_name(&self) -> &str {
        "vaccine_vial_monitor_status"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyVVMStatusRow>(&sync_record.data)?;
        let result = VVMStatusRow {
            id: data.ID,
            description: data.description,
            code: data.code,
            level: data.level,
            is_active: data.is_active,
            unusable: data.unusable,
            reason_id: data.option_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(VVMStatusRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_vvm_status_translation() {
        use crate::sync::test::test_data::vvm_status as test_data;
        let translator = VVMStatusTranslation {};

        let (_, connection, _, _) =
            setup_all("test_vvm_status_translation", MockDataInserts::none()).await;

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
