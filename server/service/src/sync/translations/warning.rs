use serde::{Deserialize, Serialize};

use repository::{StorageConnection, SyncBufferRow, WarningRow};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyWarningRow {
    #[serde(rename = "ID")]
    pub id: String,

    pub warning_text: String,
    pub code: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(WarningTranslation)
}

pub(super) struct WarningTranslation;
impl SyncTranslation for WarningTranslation {
    fn table_name(&self) -> &str {
        "warning"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyWarningRow {
            id,
            warning_text,
            code,
        } = serde_json::from_str::<LegacyWarningRow>(&sync_record.data)?;

        let result = WarningRow {
            id,
            code,
            warning_text,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_warning_translation() {
        use crate::sync::test::test_data::warning as test_data;
        let translator = WarningTranslation {};

        let (_, connection, _, _) =
            setup_all("test_warning_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
