use async_graphql::*;
use repository::{DocumentRegistry, DocumentRegistryType};
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
pub enum DocumentRegistryTypeNode {
    Patient,
    ProgramEnrolment,
    Encounter,
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

    pub async fn r#type(&self) -> DocumentRegistryTypeNode {
        match self.document_registry.r#type {
            DocumentRegistryType::Patient => DocumentRegistryTypeNode::Patient,
            DocumentRegistryType::ProgramEnrolment => DocumentRegistryTypeNode::ProgramEnrolment,
            DocumentRegistryType::Encounter => DocumentRegistryTypeNode::Encounter,
            DocumentRegistryType::Custom => DocumentRegistryTypeNode::Custom,
        }
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

impl DocumentRegistryTypeNode {
    pub fn to_domain(self) -> DocumentRegistryType {
        match self {
            DocumentRegistryTypeNode::Patient => DocumentRegistryType::Patient,
            DocumentRegistryTypeNode::ProgramEnrolment => DocumentRegistryType::ProgramEnrolment,
            DocumentRegistryTypeNode::Encounter => DocumentRegistryType::Encounter,
            DocumentRegistryTypeNode::Custom => DocumentRegistryType::Custom,
        }
    }
}
