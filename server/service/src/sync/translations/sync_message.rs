use crate::sync::translations::{store::StoreTranslation, PullTranslateResult, SyncTranslation};
use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncMessageRow, SyncMessageRowRepository,
    SyncMessageRowStatus, SyncMessageRowType,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{empty_str_as_option_string, naive_time};

use super::{to_legacy_time, PushTranslateResult};

/// Message from mSupply Central Server
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyMessageRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "toStoreID", deserialize_with = "empty_str_as_option_string")]
    pub to_store_id: Option<String>,
    #[serde(
        rename = "fromStoreID",
        deserialize_with = "empty_str_as_option_string"
    )]
    pub from_store_id: Option<String>,
    pub body: serde_json::Value,
    #[serde(rename = "createdDate")]
    pub created_date: NaiveDate,
    #[serde(rename = "createdTime", deserialize_with = "naive_time")]
    pub created_time: NaiveTime,
    pub status: LegacySyncMessageStatus,
    #[serde(rename = "type")]
    pub r#type: SyncMessageRowType,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    pub error_message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LegacySyncMessageStatus {
    #[default]
    New,
    InProgress,
    Processed,
}

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(MessageTranslation)
}
pub struct MessageTranslation;

impl SyncTranslation for MessageTranslation {
    fn table_name(&self) -> &str {
        "message"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &repository::SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyMessageRow {
            id,
            to_store_id,
            from_store_id,
            body,
            created_date,
            created_time,
            status,
            r#type,
            error_message,
        } = serde_json::from_str(&sync_record.data)?;

        let status = match status {
            LegacySyncMessageStatus::New => SyncMessageRowStatus::New,
            LegacySyncMessageStatus::InProgress => SyncMessageRowStatus::InProgress,
            LegacySyncMessageStatus::Processed => SyncMessageRowStatus::Processed,
        };

        let body = serde_json::to_string(&body).context("Failed to serialize message body")?;

        let result = SyncMessageRow {
            id,
            to_store_id,
            from_store_id,
            body,
            created_datetime: NaiveDateTime::new(created_date, created_time),
            status,
            r#type,
            error_message,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::SyncMessage)
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(message) =
            SyncMessageRowRepository::new(connection).find_one_by_id(&changelog.record_id)?
        else {
            return Err(anyhow::anyhow!("Message not found"));
        };

        let SyncMessageRow {
            id,
            to_store_id,
            from_store_id,
            body,
            created_datetime,
            status,
            r#type,
            error_message,
        } = message;

        let created_date = created_datetime.date();
        let created_time = to_legacy_time(created_datetime);

        // "unwrap_or" here would result in a string version of body json
        let body = serde_json::from_str(&body).unwrap_or(serde_json::json!(body));

        let legacy_row = LegacyMessageRow {
            id: id.clone(),
            to_store_id,
            from_store_id,
            body,
            created_date,
            created_time,
            status: match status {
                SyncMessageRowStatus::New => LegacySyncMessageStatus::New,
                SyncMessageRowStatus::InProgress => LegacySyncMessageStatus::InProgress,
                SyncMessageRowStatus::Processed => LegacySyncMessageStatus::Processed,
            },
            r#type,
            error_message,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            json_record,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_message_translation() {
        use crate::sync::test::test_data::sync_message as test_data;
        let translator = MessageTranslation {};

        let (_, connection, _, _) =
            setup_all("test_message_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
