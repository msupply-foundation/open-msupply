use repository::{AuthoriserRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::AUTHORISER;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}

#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyPrefRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub is_active: bool,
    #[serde(rename = "list_master_ID")]
    pub master_list_id: String,
    #[serde(rename = "userID")]
    pub user_id: String,
}

pub(crate) struct AuthoriserTranslation {}
impl SyncTranslation for AuthoriserTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyPrefRow>(&sync_record.data)?;

        let result = AuthoriserRow {
            id: data.id,
            is_active: data.is_active,
            master_list_id: data.master_list_id,
            user_id: data.user_id,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Authoriser(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn authoriser_translation() {
        use crate::sync::test::test_data::authoriser as test_data;
        let translator = AuthoriserTranslation {};

        let (_, connection, _, _) =
            setup_all("test_authoriser_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
