use async_graphql::{dataloader::DataLoader, *};
use graphql_core::{
    loader::{DocumentRegistryChildrenLoader, DocumentRegistryLoaderInput},
    ContextExt,
};
use repository::{DocumentContext, DocumentRegistry};
use serde::Serialize;

#[derive(SimpleObject)]
pub struct DocumentRegistryConnector {
    pub total_count: u32,
    pub nodes: Vec<DocumentRegistryNode>,
}

pub struct DocumentRegistryNode {
    pub allowed_docs: Vec<String>,
    pub document_registry: DocumentRegistry,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentRegistryNodeContext {
    Patient,
    Program,
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

    pub async fn context(&self) -> DocumentRegistryNodeContext {
        match self.document_registry.context {
            DocumentContext::Patient => DocumentRegistryNodeContext::Patient,
            DocumentContext::Program => DocumentRegistryNodeContext::Program,
            DocumentContext::Encounter => DocumentRegistryNodeContext::Encounter,
            DocumentContext::Custom => DocumentRegistryNodeContext::Custom,
        }
    }

    pub async fn name(&self) -> &Option<String> {
        &self.document_registry.name
    }

    pub async fn parent_id(&self) -> &Option<String> {
        &self.document_registry.parent_id
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

    pub async fn children(&self, ctx: &Context<'_>) -> Result<Vec<DocumentRegistryNode>> {
        let loader = ctx.get_loader::<DataLoader<DocumentRegistryChildrenLoader>>();
        let children = loader
            .load_one(DocumentRegistryLoaderInput::new(
                &self.allowed_docs,
                &self.document_registry.id,
            ))
            .await?
            .unwrap_or(vec![]);
        Ok(children
            .into_iter()
            .map(|document_registry| DocumentRegistryNode {
                allowed_docs: self.allowed_docs.clone(),
                document_registry,
            })
            .collect())
    }
}

impl DocumentRegistryNodeContext {
    pub fn to_domain(self) -> DocumentContext {
        match self {
            DocumentRegistryNodeContext::Patient => DocumentContext::Patient,
            DocumentRegistryNodeContext::Program => DocumentContext::Program,
            DocumentRegistryNodeContext::Encounter => DocumentContext::Encounter,
            DocumentRegistryNodeContext::Custom => DocumentContext::Custom,
        }
    }
}
