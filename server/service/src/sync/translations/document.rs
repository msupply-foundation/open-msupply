use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, DocumentRepository, DocumentRow, DocumentStatus,
    StorageConnection, SyncBufferRow,
};

use crate::sync::{
    api::RemoteSyncRecordV5, sync_serde::empty_str_as_option_string, translations::LegacyTableName,
};

use super::{IntegrationRecords, PullUpsertRecord, SyncTranslation};

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
    pub parent_ids: String,
    pub user_id: String,
    pub datetime: NaiveDateTime,
    #[serde(rename = "type")]
    pub r#type: String,
    pub data: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub form_schema_id: Option<String>,
    pub status: LegacyDocumentStatus,
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub owner_name_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub context: Option<String>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::DOCUMENT
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Document
}

pub(crate) struct DocumentTranslation {}
impl SyncTranslation for DocumentTranslation {
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
            comment,
            owner_name_id,
            context,
        } = serde_json::from_str::<LegacyDocumentRow>(&sync_record.data)?;

        let result = DocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status: match status {
                LegacyDocumentStatus::Active => DocumentStatus::Active,
                LegacyDocumentStatus::Deleted => DocumentStatus::Deleted,
            },
            comment,
            owner_name_id,
            context,
        };
        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Document(result.to_document()?),
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
            comment,
            owner_name_id,
            context,
        } = document.to_row()?;

        let legacy_row = LegacyDocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status: match status {
                DocumentStatus::Active => LegacyDocumentStatus::Active,
                DocumentStatus::Deleted => LegacyDocumentStatus::Deleted,
            },
            comment,
            owner_name_id,
            context,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LegacyTableName::DOCUMENT,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}
