use repository::{MasterListNameJoinRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterNameJoinRow {
    ID: String,
    name_ID: String,
    list_master_ID: String,
}

pub(crate) struct MasterListNameJoinTranslation {}
impl SyncTranslation for MasterListNameJoinTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::LIST_MASTER_NAME_JOIN;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterNameJoinRow>(&sync_record.data)?;
        if data.name_ID == "" {
            return Ok(None);
        }

        let result = MasterListNameJoinRow {
            id: data.ID,
            master_list_id: data.list_master_ID,
            name_id: data.name_ID,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::MasterListNameJoin(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_master_list_name_join_translation() {
        use crate::sync::test::test_data::master_list_name_join as test_data;
        let translator = MasterListNameJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_master_list_name_join_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
