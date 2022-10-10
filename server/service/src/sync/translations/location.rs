use repository::{
    ChangelogRow, ChangelogTableName, LocationRow, LocationRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::api::RemoteSyncRecordV5;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::LOCATION;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Location
}

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
        if !match_pull_table(sync_record) {
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

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let LocationRow {
            id,
            name,
            code,
            on_hold,
            store_id,
        } = LocationRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Location row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyLocationRow {
            id: id.clone(),
            name,
            code,
            on_hold,
            store_id: store_id,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

        Ok(result)
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
