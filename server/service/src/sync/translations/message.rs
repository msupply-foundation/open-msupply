use crate::sync::{
    sync_serde::{empty_str_as_option_string, naive_time},
    translations::{PullTranslateResult, SyncTranslation},
};

use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, MessageRow, MessageRowRepository, MessageRowStatus,
    MessageRowType, StorageConnection,
};
use serde::{Deserialize, Serialize};

use super::PushTranslateResult;

/// Message from mSupply Central Server
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyMessageRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "toStoreID")]
    pub to_store_id: String,
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
    pub status: LegacyMessageStatus,
    #[serde(rename = "type")]
    pub r#type: MessageRowType,
}

#[derive(Debug, Deserialize, Serialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LegacyMessageStatus {
    #[default]
    New,
    Processed,
    Error,
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
        vec![]
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
        } = serde_json::from_str::<LegacyMessageRow>(&sync_record.data)?;

        let status = match status {
            LegacyMessageStatus::New => MessageRowStatus::New,
            LegacyMessageStatus::Processed => MessageRowStatus::Processed,
            LegacyMessageStatus::Error => MessageRowStatus::Error,
        };

        let body = serde_json::to_string(&body).context("Failed to serialize message body")?;

        let result = MessageRow {
            id,
            to_store_id,
            from_store_id,
            body,
            created_datetime: NaiveDateTime::new(created_date, created_time),
            status,
            r#type,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Message)
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(message) =
            MessageRowRepository::new(connection).find_one_by_id(&changelog.record_id)?
        else {
            return Err(anyhow::anyhow!("Message not found"));
        };

        let MessageRow {
            id,
            to_store_id,
            from_store_id,
            body,
            created_datetime,
            status,
            r#type,
        } = message;

        let created_date = created_datetime.date();
        let created_time = created_datetime.time();

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
                MessageRowStatus::New => LegacyMessageStatus::New,
                MessageRowStatus::Processed => LegacyMessageStatus::Processed,
                MessageRowStatus::Error => LegacyMessageStatus::Error,
            },
            r#type,
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
        use crate::sync::test::test_data::message as test_data;
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
