use repository::{MasterListLineRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterLineRow {
    ID: String,
    item_master_ID: String,
    item_ID: String,
}

pub(crate) struct MasterListLineTranslation {}
impl SyncTranslation for MasterListLineTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::LIST_MASTER_LINE;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterLineRow>(&sync_record.data)?;
        let result = MasterListLineRow {
            id: data.ID,
            item_id: data.item_ID,
            master_list_id: data.item_master_ID,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::MasterListLine(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_invoice_translation() {
        use crate::sync::test::test_data::master_list_line as test_data;
        let translator = MasterListLineTranslation {};

        let (_, connection, _, _) =
            setup_all("test_master_list_line_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
