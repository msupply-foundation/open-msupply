use crate::sync::{
    sync_serde::empty_str_as_option_string,
    translations::{form_schema::FormSchemaTranslation, master_list::MasterListTranslation},
};
use repository::{DocumentRegistryCategory, DocumentRegistryRow, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use serde_json::Value;

use super::{PullTranslateResult, SyncTranslation};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum LegacyDocumentCategory {
    Patient,
    ProgramEnrolment,
    Encounter,
    ContactTrace,
    Custom,
    #[serde(other)]
    Others
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyDocumentRegistryRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub category: LegacyDocumentCategory,
    pub document_type: String,
    #[serde(rename = "context_ID")]
    pub context_id: String,
    pub name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "form_schema_ID")]
    pub form_schema_id: Option<String>,
    pub config: Option<Value>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(DocumentRegistryTranslation)
}

pub(super) struct DocumentRegistryTranslation;
impl SyncTranslation for DocumentRegistryTranslation {
    fn table_name(&self) -> &str {
        "om_document_registry"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            FormSchemaTranslation.table_name(),
            // The program context is synced via the program master list
            MasterListTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyDocumentRegistryRow {
            id,
            document_type,
            context_id,
            category,
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
            context_id,
            category: match category {
                LegacyDocumentCategory::Patient => DocumentRegistryCategory::Patient,
                LegacyDocumentCategory::ProgramEnrolment => {
                    DocumentRegistryCategory::ProgramEnrolment
                }
                LegacyDocumentCategory::Encounter => DocumentRegistryCategory::Encounter,
                LegacyDocumentCategory::ContactTrace => DocumentRegistryCategory::ContactTrace,
                LegacyDocumentCategory::Custom => DocumentRegistryCategory::Custom,
                LegacyDocumentCategory::Others => {
                    return Ok(PullTranslateResult::Ignored(
                        "Unsupported report type".to_string(),
                    ));
                }
            },
            name,
            form_schema_id,
            config: config_str,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}
