use crate::sync::sync_serde::empty_str_as_option_string;
use anyhow::anyhow;
use repository::{ProgramIndicatorRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::master_list::MasterListTranslation;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyProgramIndicator {
    #[serde(rename = "ID")]
    id: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    code: Option<String>,
    #[serde(rename = "program_ID")]
    program_id: String,
    is_active: bool,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ProgramIndicatorTranslation)
}
pub(super) struct ProgramIndicatorTranslation;
impl SyncTranslation for ProgramIndicatorTranslation {
    fn table_name(&self) -> &str {
        "program_indicator"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![MasterListTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyProgramIndicator>(&sync_record.data)?;

        let result = ProgramIndicatorRow {
            id: data.id,
            code: data.code,
            program_id: data.program_id,
            is_active: data.is_active,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Err(anyhow!(
            "Delete not supported for program_indicator records"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_program_indicator_translation() {
        use crate::sync::test::test_data::program_indicator;
        let translator = ProgramIndicatorTranslation;

        let (_, connection, _, _) = setup_all(
            "test_program_indicator_translation",
            MockDataInserts::none(),
        )
        .await;

        program_indicator::test_pull_upsert_records()
            .into_iter()
            .for_each(|record| {
                assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
                let translation_result = translator
                    .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                    .unwrap();

                assert_eq!(translation_result, record.translated_record);
            });
    }
}
