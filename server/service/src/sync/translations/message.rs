use crate::sync::{
    sync_serde::{empty_str_as_option_string, zero_date_as_option},
    translations::{PullTranslateResult, SyncTranslation},
};

use chrono::{NaiveDate, NaiveTime};
use repository::{MessageRow, MessageStatus, MessageType, StorageConnection};
use serde::{Deserialize, Serialize};

/// Message from mSupply Central Server
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyMessageRow {
    pub ID: String,
    #[serde(rename = "toStoreID")]
    pub to_store_id: String,
    #[serde(rename = "fromStoreID", deserialize_with = "empty_str_as_option_string")]
    pub from_store_id: Option<String>,
    pub body: String,
    #[serde(rename = "createdDate", deserialize_with = "zero_date_as_option")]
    pub created_date: Option<NaiveDate>,
    #[serde(rename = "createdTime")]
    pub created_time: i32,
    pub status: LegacyMessageStatus,
    #[serde(rename = "type")]
    pub type_: LegacyMessageType,
}

#[derive(Debug, Deserialize, Serialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LegacyMessageStatus {
    #[default]
    New,
    Read,
    Processed,
    Failed,
}

#[derive(Debug, Deserialize, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum LegacyMessageType {
    #[default]
    RequestFieldChange,
    Notification,
    Alert,
    Info,
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
        let data = serde_json::from_str::<LegacyMessageRow>(&sync_record.data)?;

        let message_status = match data.status {
            LegacyMessageStatus::New => MessageStatus::New,
            LegacyMessageStatus::Read => MessageStatus::Read,
            LegacyMessageStatus::Processed => MessageStatus::Processed,
            LegacyMessageStatus::Failed => MessageStatus::Failed,
        };

        let message_type = match data.type_ {
            LegacyMessageType::RequestFieldChange => MessageType::RequestFieldChange,
            LegacyMessageType::Notification => MessageType::Notification,
            LegacyMessageType::Alert => MessageType::Alert,
            LegacyMessageType::Info => MessageType::Info,
        };

        let result = MessageRow {
            id: data.ID,
            to_store_id: data.to_store_id,
            from_store_id: data.from_store_id,
            body: data.body,
            created_date: data.created_date.unwrap_or_else(|| chrono::Local::now().date_naive()),
            created_time: data.created_time,
            status: message_status,
            r#type: message_type,
        };

        Ok(PullTranslateResult::upsert(result))
    }
    
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &repository::SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        use repository::MessageRowDelete;
        Ok(PullTranslateResult::delete(MessageRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}
