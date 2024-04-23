use repository::{NameTagRow, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameTagRow {
    pub ID: String,
    pub description: String,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameTagTranslation)
}

pub(super) struct NameTagTranslation;
impl SyncTranslation for NameTagTranslation {
    fn table_name(&self) -> &str {
        "name_tag"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyNameTagRow { ID, description } =
            serde_json::from_str::<LegacyNameTagRow>(&sync_record.data)?;

        let result = NameTagRow {
            id: ID,
            name: description,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_tag_translation() {
        use crate::sync::test::test_data::name_tag as test_data;
        let translator = NameTagTranslation;

        let (_, connection, _, _) =
            setup_all("test_name_tag_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
