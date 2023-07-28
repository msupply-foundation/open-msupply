use crate::sync::sync_serde::empty_str_as_option_string;
use repository::{DocumentRegistryRow, DocumentRegistryType, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use serde_json::Value;

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum LegacyDocumentType {
    Patient,
    ProgramEnrolment,
    Encounter,
    Custom,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyDocumentRegistryRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub r#type: LegacyDocumentType,
    pub document_type: String,
    pub document_context: String,
    pub name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "form_schema_ID")]
    pub form_schema_id: Option<String>,
    pub config: Option<Value>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::DOCUMENT_REGISTRY
}

pub(crate) struct DocumentRegistryTranslation {}
impl SyncTranslation for DocumentRegistryTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::DOCUMENT_REGISTRY,
            dependencies: vec![LegacyTableName::FORM_SCHEMA, LegacyTableName::LIST_MASTER],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let LegacyDocumentRegistryRow {
            id,
            document_type,
            document_context,
            r#type,
            name,
            form_schema_id,
            config,
        } = serde_json::from_str::<LegacyDocumentRegistryRow>(&sync_record.data)?;

        let config_str = match config {
            Some(config) => Some(serde_json::to_string(&config)?),
            None => None,
        };
        let result = DocumentRegistryRow {
            id,
            document_type,
            context_id: document_context,
            r#type: match r#type {
                LegacyDocumentType::Patient => DocumentRegistryType::Patient,
                LegacyDocumentType::ProgramEnrolment => DocumentRegistryType::ProgramEnrolment,
                LegacyDocumentType::Encounter => DocumentRegistryType::Encounter,
                LegacyDocumentType::Custom => DocumentRegistryType::Custom,
            },
            name,
            form_schema_id,
            config: config_str,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::DocumentRegistry(result),
        )))
    }
}
