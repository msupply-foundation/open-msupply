use repository::{StorageConnection, SyncBufferRow, UnitRow};

use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyUnitRow {
    ID: String,
    units: String,
    comment: String,
    order_number: i32,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::UNIT
}

pub(crate) struct UnitTranslation {}
impl SyncTranslation for UnitTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::UNIT,
            dependencies: vec![],
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

        let data = serde_json::from_str::<LegacyUnitRow>(&sync_record.data)?;
        let mut result = UnitRow {
            id: data.ID,
            name: data.units,
            description: None,
            index: data.order_number,
            is_active: true,
        };

        if data.comment != "" {
            result.description = Some(data.comment);
        }

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Unit(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(&sync_record.record_id, PullDeleteRecordTable::Unit)
        });

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_unit_translation() {
        use crate::sync::test::test_data::unit as test_data;
        let translator = UnitTranslation {};

        let (_, connection, _, _) =
            setup_all("test_unit_translation", MockDataInserts::none()).await;

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
