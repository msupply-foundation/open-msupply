use repository::{NameTagRow, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameTagRow {
    pub ID: String,
    pub description: String,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::NAME_TAG
}

pub(crate) struct NameTagTranslation {}
impl SyncTranslation for NameTagTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let LegacyNameTagRow { ID, description } =
            serde_json::from_str::<LegacyNameTagRow>(&sync_record.data)?;

        let result = NameTagRow {
            id: ID,
            name: description,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::NameTag(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        _sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        // Name tags are not deleted in mSupply.

        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_tag_translation() {
        use crate::sync::test::test_data::name_tag as test_data;
        let translator = NameTagTranslation {};

        let (_, connection, _, _) =
            setup_all("test_name_tag_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
