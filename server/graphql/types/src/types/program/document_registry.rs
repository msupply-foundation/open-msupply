use async_graphql::*;
use repository::DocumentRegistry;
use serde::Serialize;

#[derive(SimpleObject)]
pub struct DocumentRegistryConnector {
    pub total_count: u32,
    pub nodes: Vec<DocumentRegistryNode>,
}

pub struct DocumentRegistryNode {
    pub allowed_ctx: Vec<String>,
    pub document_registry: DocumentRegistry,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(remote = "repository::db_diesel::document_registry_row
::DocumentRegistryCategory")]
pub enum DocumentRegistryCategoryNode {
    Patient,
    ProgramEnrolment,
    Encounter,
    ContactTrace,
    Custom,
}

#[Object]
impl DocumentRegistryNode {
    pub async fn id(&self) -> &str {
        &self.document_registry.id
    }

    pub async fn document_type(&self) -> &str {
        &self.document_registry.document_type
    }

    pub async fn context_id(&self) -> &str {
        &self.document_registry.context_id
    }

    pub async fn category(&self) -> DocumentRegistryCategoryNode {
        DocumentRegistryCategoryNode::from(self.document_registry.category.clone())
    }

    pub async fn name(&self) -> &Option<String> {
        &self.document_registry.name
    }

    pub async fn form_schema_id(&self) -> &str {
        &self.document_registry.form_schema_id
    }

    pub async fn json_schema(&self) -> &serde_json::Value {
        &self.document_registry.json_schema
    }

    pub async fn ui_schema_type(&self) -> &str {
        &self.document_registry.ui_schema_type
    }

    pub async fn ui_schema(&self) -> &serde_json::Value {
        &self.document_registry.ui_schema
    }
}
