use repository::{NameTagJoinRow, NameTagJoinRowDelete, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{name::NameTranslation, name_tag::NameTagTranslation};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNameTagJoinRow {
    ID: String,
    name_ID: String,
    name_tag_ID: String,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameTagJoinTranslation)
}

pub(super) struct NameTagJoinTranslation;
impl SyncTranslation for NameTagJoinTranslation {
    fn table_name(&self) -> &'static str {
        "name_tag_join"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            NameTranslation.table_name(),
            NameTagTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyNameTagJoinRow {
            ID,
            name_ID,
            name_tag_ID,
        } = serde_json::from_str::<LegacyNameTagJoinRow>(&sync_record.data)?;
        if name_ID == "" {
            return Ok(PullTranslateResult::Ignored("Name id is empty".to_string()));
        }

        let result = NameTagJoinRow {
            id: ID,
            name_link_id: name_ID,
            name_tag_id: name_tag_ID,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(NameTagJoinRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_tag_join_translation() {
        use crate::sync::test::test_data::name_tag_join as test_data;
        let translator = NameTagJoinTranslation {};

        let (_, connection, _, _) =
            setup_all("test_name_tag_join_translation", MockDataInserts::none()).await;

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
