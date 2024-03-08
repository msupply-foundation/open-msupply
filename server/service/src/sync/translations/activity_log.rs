use chrono::NaiveDateTime;
use repository::{
    ActivityLogRow, ActivityLogRowRepository, ActivityLogType, ChangelogRow, ChangelogTableName,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{sync_serde::empty_str_as_option_string, translations::store::StoreTranslation};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub changed_to: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub changed_from: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ActivityLogTranslation)
}

pub(super) struct ActivityLogTranslation;
impl SyncTranslation for ActivityLogTranslation {
    fn table_name(&self) -> &'static str {
        "om_activity_log"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyActivityLogRow>(&sync_record.data)?;

        let result = ActivityLogRow {
            id: data.id.to_string(),
            r#type: data.r#type,
            user_id: Some(data.user_id),
            store_id: Some(data.store_id),
            record_id: Some(data.record_id),
            datetime: data.datetime,
            changed_to: data.changed_to,
            changed_from: data.changed_from,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::ActivityLog)
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let ActivityLogRow {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
            datetime,
            changed_to,
            changed_from,
        } = ActivityLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Activity log row ({}) not found",
                changelog.record_id
            )))?;

        let (Some(store_id), Some(record_id), Some(user_id)) = (store_id, record_id, user_id)
        else {
            return Ok(PushTranslateResult::Ignored(
                "Ignoring activity logs without store, user or record id".to_string(),
            ));
        };

        let legacy_row = LegacyActivityLogRow {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
            datetime,
            changed_to,
            changed_from,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
