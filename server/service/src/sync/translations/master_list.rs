use repository::{MasterListRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    ID: String,
    description: String,
    code: String,
    note: String,
}

pub(crate) struct MasterListTranslation {}
impl SyncTranslation for MasterListTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::LIST_MASTER;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        let result = MasterListRow {
            id: data.ID,
            name: data.description,
            code: data.code,
            description: data.note,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::MasterList(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_master_list_translation() {
        use crate::sync::test::test_data::master_list as test_data;
        let translator = MasterListTranslation {};

        let (_, connection, _, _) =
            setup_all("test_master_list_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
