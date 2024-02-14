use repository::{MasterListNameJoinRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterNameJoinRow {
    ID: String,
    name_ID: String,
    list_master_ID: String,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::LIST_MASTER_NAME_JOIN
}

pub(crate) struct MasterListNameJoinTranslation {}
impl SyncTranslation for MasterListNameJoinTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::LIST_MASTER_NAME_JOIN,
            dependencies: vec![LegacyTableName::NAME, LegacyTableName::LIST_MASTER],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterNameJoinRow>(&sync_record.data)?;
        if data.name_ID == "" {
            return Ok(None);
        }

        let result = MasterListNameJoinRow {
            id: data.ID,
            master_list_id: data.list_master_ID,
            name_link_id: data.name_ID,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::MasterListNameJoin(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::MasterListNameJoin,
            )
        });

        Ok(result)
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
