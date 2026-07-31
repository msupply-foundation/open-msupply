use crate::sync::translations::{store::StoreTranslation, PullTranslateResult, SyncTranslation};
use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncMessageRow,
    SyncMessageRowRepository, SyncMessageRowStatus, SyncMessageRowType,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{empty_str_as_option_string, naive_time};

use super::{to_legacy_time, FkField, PushTranslateResult};

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
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
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
        } = sync_record.deserialize()?;

        let status = match status {
            LegacySyncMessageStatus::New => SyncMessageRowStatus::New,
            LegacySyncMessageStatus::InProgress => SyncMessageRowStatus::InProgress,
            LegacySyncMessageStatus::Processed => SyncMessageRowStatus::Processed,
            LegacySyncMessageStatus::Error => SyncMessageRowStatus::Error,
        };

        let body = serde_json::to_string(&body).context("Failed to serialize message body")?;

        let fk_check = fk_checker.with_table(connection, "message", &id);

        let result = SyncMessageRow {
            id,
            to_store_id: fk_check(to_store_id, "to_store_id", FkField::Store)?,
            from_store_id: fk_check(from_store_id, "from_store_id", FkField::Store)?,
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
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::SyncMessage(sync_message_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let Some(message) =
            SyncMessageRowRepository::new(connection).find_one_by_id(&sync_message_row.id)?
        else {
            return Err(anyhow::anyhow!("Message not found"));
        };

        // SupportUpload messages are an open-mSupply-only flow (processed by
        // SupportUploadFilesProcessor on the receiving site, files uploaded
        // to OMS central via TUS) — legacy mSupply has no handler for them.
        // OmSyncMessageTranslation owns that path; we skip here so we don't
        // double-sync the same row to both centrals.
        if matches!(message.r#type, SyncMessageRowType::SupportUpload) {
            return Ok(PushTranslateResult::NotMatched);
        }

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
                SyncMessageRowStatus::Error => LegacySyncMessageStatus::Error,
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
            setup_all("test_message_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
