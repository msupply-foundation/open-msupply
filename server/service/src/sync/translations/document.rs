use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, Document, DocumentRepository, DocumentRow, DocumentStatus,
    StorageConnection, SyncBufferRow,
};
use serde_json::Value;

use crate::sync::{
    integrate_document::DocumentUpsert,
    sync_serde::empty_str_as_option_string,
    translations::{
        document_registry::DocumentRegistryTranslation, form_schema::FormSchemaTranslation,
        name::NameTranslation,
    },
};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(DocumentTranslation)
}

pub(super) struct DocumentTranslation;
impl SyncTranslation for DocumentTranslation {
    fn table_name(&self) -> &str {
        "om_document"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            FormSchemaTranslation.table_name(),
            DocumentRegistryTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Document)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
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
        Ok(PullTranslateResult::upsert(DocumentUpsert(result)))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
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

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }
}
