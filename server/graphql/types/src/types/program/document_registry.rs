use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::{
    ContextExt,
    loader::{DocumentRegistryLoader, DocumentRegistryLoaderInput},
};
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

/// The registry entry of a document type, for a row that names its document's
/// type and so needs no document loaded to answer.
pub async fn document_registry_node(
    ctx: &Context<'_>,
    allowed_ctx: &[String],
    document_type: &str,
) -> Result<Option<DocumentRegistryNode>> {
    let loader = ctx.get_loader::<DataLoader<DocumentRegistryLoader>>();
    let document_registry = loader
        .load_one(DocumentRegistryLoaderInput::new(allowed_ctx, document_type))
        .await?;
    Ok(
        document_registry.map(|document_registry| DocumentRegistryNode {
            allowed_ctx: allowed_ctx.to_vec(),
            document_registry,
        }),
    )
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
