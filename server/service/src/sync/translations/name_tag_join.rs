use repository::{NameTagJoinRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNameTagJoinRow {
    ID: String,
    name_ID: String,
    name_tag_ID: String,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::NAME_TAG_JOIN
}

pub(crate) struct NameTagJoinTranslation {}
impl SyncTranslation for NameTagJoinTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::NAME_TAG_JOIN,
            dependencies: vec![LegacyTableName::NAME, LegacyTableName::NAME_TAG],
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

        let LegacyNameTagJoinRow {
            ID,
            name_ID,
            name_tag_ID,
        } = serde_json::from_str::<LegacyNameTagJoinRow>(&sync_record.data)?;
        if name_ID == "" {
            return Ok(None);
        }

        let result = NameTagJoinRow {
            id: ID,
            name_link_id: name_ID,
            name_tag_id: name_tag_ID,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::NameTagJoin(result),
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
                PullDeleteRecordTable::NameTagJoin,
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
    async fn test_name_tag_join_translation() {
        use crate::sync::test::test_data::name_tag_join as test_data;
        let translator = NameTagJoinTranslation {};

        let (_, connection, _, _) =
            setup_all("test_name_tag_join_translation", MockDataInserts::none()).await;

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
