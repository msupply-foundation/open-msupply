use repository::{StorageConnection, StorePreferenceRow, StorePreferenceType, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::STORE_PREFERENCE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyOptionsType {
    #[serde(rename = "store_preferences")]
    StorePreferences,
}
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyPrefRow {
    #[serde(rename = "store_ID")]
    pub id: String,
    #[serde(rename = "item")]
    pub r#type: LegacyOptionsType,
    pub data: LegacyPrefData,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyPrefData {
    #[serde(rename = "default_item_packsize_to_one")]
    pub pack_to_one: bool,
}

pub(crate) struct StorePreferenceTranslation {}
impl SyncTranslation for StorePreferenceTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyPrefRow>(&sync_record.data)?;

        let r#type = match data.r#type {
            LegacyOptionsType::StorePreferences => StorePreferenceType::StorePreferences,
        };

        let result = StorePreferenceRow {
            id: data.id,
            r#type,
            pack_to_one: data.data.pack_to_one,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::StorePreference(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_store_preference_translation() {
        use crate::sync::test::test_data::store_preference as test_data;
        let translator = StorePreferenceTranslation {};

        let (_, connection, _, _) =
            setup_all("test_store_preference_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
