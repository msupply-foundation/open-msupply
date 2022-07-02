use repository::{
    ChangelogRow, ChangelogTableName, LocationRow, LocationRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullUpsertRecord, PushUpsertRecord, SyncTranslation,
};

#[derive(Deserialize, Serialize)]
pub struct LegacyLocationRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Description")]
    pub name: String,
    pub code: String,
    #[serde(rename = "hold")]
    pub on_hold: bool,
    #[serde(rename = "store_ID")]
    pub store_id: String,
}

pub(crate) struct LocationTranslation {}
impl SyncTranslation for LocationTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::LOCATION;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let LegacyLocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        } = serde_json::from_str::<LegacyLocationRow>(&sync_record.data)?;

        let result = LocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Location(result),
        )))
    }

    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::Location {
            return Ok(None);
        }
        let table_name = LegacyTableName::LOCATION;

        let LocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        } = LocationRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Location row ({}) not found",
                changelog.row_id
            )))?;

        let legacy_row = LegacyLocationRow {
            id: id.clone(),
            name,
            code,
            on_hold,
            store_id: store_id.clone(),
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_location_translation() {
        use crate::sync::test::test_data::location as test_data;
        let translator = LocationTranslation {};

        let (_, connection, _, _) =
            setup_all("test_location_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
