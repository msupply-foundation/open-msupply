use repository::{
    schema::RemoteSyncBufferRow, ChangelogRow, ChangelogTableName, LocationRow,
    LocationRowRepository, StorageConnection,
};
use serde::{Deserialize, Serialize};

use super::{
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{PushUpsertRecord, RemotePushUpsertTranslation},
    TRANSLATION_RECORD_LOCATION,
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

pub struct LocationTranslation {}
impl RemotePullTranslation for LocationTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_LOCATION;
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

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Location(LocationRow {
                id,
                name,
                code,
                on_hold,
                store_id,
            }),
        )))
    }
}

impl RemotePushUpsertTranslation for LocationTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::Location {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_LOCATION;

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
