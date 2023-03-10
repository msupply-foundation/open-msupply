use repository::{DocumentContext, DocumentRegistryRow, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use serde_json::Value;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum LegacyDocumentContext {
    Patient,
    Program,
    Encounter,
    Custom,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyDocumentRegistryRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub document_type: String,
    pub context: LegacyDocumentContext,
    pub name: Option<String>,
    pub parent_id: Option<String>,
    pub form_schema_id: Option<String>,
    pub config: Option<Value>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::DOCUMENT_REGISTRY
}

pub(crate) struct DocumentRegistryTranslation {}
impl SyncTranslation for DocumentRegistryTranslation {
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
            context,
            name,
            parent_id,
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
            context: match context {
                LegacyDocumentContext::Patient => DocumentContext::Patient,
                LegacyDocumentContext::Program => DocumentContext::Program,
                LegacyDocumentContext::Encounter => DocumentContext::Encounter,
                LegacyDocumentContext::Custom => DocumentContext::Custom,
            },
            name,
            parent_id,
            form_schema_id,
            config: config_str,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::DocumentRegistry(result),
        )))
    }
}
