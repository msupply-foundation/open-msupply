use repository::{StorageConnection, StoreRow, SyncBufferRow};

use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

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

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::STORE
}
pub(crate) struct StoreTranslation {}
impl SyncTranslation for StoreTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
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

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(&sync_record.record_id, PullDeleteRecordTable::Store)
        });

        Ok(result)
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

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
