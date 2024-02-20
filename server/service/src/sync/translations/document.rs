use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, Document, DocumentRepository, DocumentRow, DocumentStatus,
    StorageConnection, SyncBufferRow,
};
use serde_json::Value;

use crate::sync::{
    api::RemoteSyncRecordV5, sync_serde::empty_str_as_option_string, translations::LegacyTableName,
};

use super::{IntegrationRecords, PullDependency, PullUpsertRecord, SyncTranslation};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum LegacyDocumentStatus {
    Active,
    Deleted,
}

#[derive(Deserialize, Serialize)]
struct LegacyDocumentRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
    #[serde(rename = "parent_IDs")]
    pub parent_ids: String,
    #[serde(rename = "user_ID")]
    pub user_id: String,
    pub datetime: NaiveDateTime,
    #[serde(rename = "type")]
    pub r#type: String,
    pub data: Value,
    #[serde(rename = "form_schema_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub form_schema_id: Option<String>,
    pub status: LegacyDocumentStatus,
    #[serde(rename = "owner_name_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub owner_name_id: Option<String>,
    #[serde(rename = "context_ID")]
    pub context_id: String,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::DOCUMENT
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Document
}

pub(crate) struct DocumentTranslation {}
impl SyncTranslation for DocumentTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::DOCUMENT,
            dependencies: vec![
                LegacyTableName::NAME,
                LegacyTableName::FORM_SCHEMA,
                // DocumentRegistry is needed in `upsert_document()`
                LegacyTableName::DOCUMENT_REGISTRY,
            ],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let LegacyDocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status,
            owner_name_id,
            context_id,
        } = serde_json::from_str::<LegacyDocumentRow>(&sync_record.data)?;
        let result = Document {
            id,
            name,
            parent_ids: serde_json::from_str(&parent_ids)?,
            user_id,
            datetime: DateTime::<Utc>::from_naive_utc_and_offset(datetime, Utc),
            r#type,
            data,
            form_schema_id,
            status: match status {
                LegacyDocumentStatus::Active => DocumentStatus::Active,
                LegacyDocumentStatus::Deleted => DocumentStatus::Deleted,
            },
            owner_name_id,
            context_id,
        };
        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Document(result),
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

        let document = DocumentRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Document row ({}) not found",
                changelog.record_id
            )))?;
        let DocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status,
            owner_name_link_id: _,
            context_id,
        } = document.to_row()?;

        let legacy_row = LegacyDocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data: serde_json::to_value(data)?,
            form_schema_id,
            status: match status {
                DocumentStatus::Active => LegacyDocumentStatus::Active,
                DocumentStatus::Deleted => LegacyDocumentStatus::Deleted,
            },
            owner_name_id: document.owner_name_id,
            context_id,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LegacyTableName::DOCUMENT,
            serde_json::to_value(legacy_row)?,
        )]))
    }
}
