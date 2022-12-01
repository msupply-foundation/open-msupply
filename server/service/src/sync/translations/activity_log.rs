use chrono::NaiveDateTime;
use repository::{
    ActivityLogRow, ActivityLogRowRepository, ActivityLogType, ChangelogRow, ChangelogTableName,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{api::RemoteSyncRecordV5, sync_serde::empty_str_as_option};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::OM_ACTIVITY_LOG;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::ActivityLog
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyActivityLogRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: ActivityLogType,
    #[serde(rename = "user_ID")]
    pub user_id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "record_ID")]
    pub record_id: String,
    pub datetime: NaiveDateTime,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub event: Option<String>,
}

pub(crate) struct ActivityLogTranslation {}
impl SyncTranslation for ActivityLogTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyActivityLogRow>(&sync_record.data)?;

        let result = ActivityLogRow {
            id: data.id.to_string(),
            r#type: data.r#type,
            user_id: Some(data.user_id),
            store_id: Some(data.store_id),
            record_id: Some(data.record_id),
            datetime: data.datetime,
            event: data.event,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::ActivityLog(result),
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

        let ActivityLogRow {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
            datetime,
            event,
        } = ActivityLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Activity log row ({}) not found",
                changelog.record_id
            )))?;

        let (store_id, record_id, user_id) = match (store_id, record_id, user_id) {
            (Some(store_id), Some(record_id), Some(user_id)) => (store_id, record_id, user_id),
            _ => return Ok(Some(Vec::new())),
        };

        let legacy_row = LegacyActivityLogRow {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
            datetime,
            event,
        };
        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_activity_log_translation() {
        use crate::sync::test::test_data::activity_log as test_data;
        let translator = ActivityLogTranslation {};

        let (_, connection, _, _) =
            setup_all("test_activity_log_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
