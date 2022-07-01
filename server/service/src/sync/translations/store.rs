use repository::{StorageConnection, StoreRow, SyncBufferRow};

use serde::Deserialize;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    code: String,
    #[serde(rename = "sync_id_remote_site")]
    site_id: i32,
}

pub(crate) struct StoreTranslation {}
impl SyncTranslation for StoreTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::STORE;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data)?;

        // Ignore the following stores as they are system stores with some properties that prevent them from being integrated
        // HIS -> Hospital Information System (no name_id)
        // SM -> Supervisor Store
        // DRG -> Drug Registration (name_id exists but no name with that id)
        match &data.code[..] {
            "HIS" => return Ok(None),
            "DRG" => return Ok(None),
            "SM" => return Ok(None),
            _ => {}
        }

        // ignore stores without name
        if data.name_id == "" {
            return Ok(None);
        }

        let result = StoreRow {
            id: data.id,
            name_id: data.name_id,
            code: data.code,
            site_id: data.site_id,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Store(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_store_translation() {
        use crate::sync::test::test_data::store as test_data;
        let translator = StoreTranslation {};

        let (_, connection, _, _) =
            setup_all("test_store_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
