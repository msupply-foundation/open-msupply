use async_graphql::{dataloader::DataLoader, *};
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::{DocumentRegistryChildrenLoader, DocumentRegistryLoaderInput},
    map_filter, ContextExt,
};
use repository::{
    DocumentRegistry, DocumentRegistryFilter, DocumentRegistrySort, DocumentRegistrySortField,
    DocumentRegistryType, EqualFilter,
};
use serde::Serialize;

#[derive(InputObject, Clone)]
pub struct EqualFilterDocumentRegistryTypeInput {
    pub equal_to: Option<DocumentRegistryTypeNode>,
    pub equal_any: Option<Vec<DocumentRegistryTypeNode>>,
    pub not_equal_to: Option<DocumentRegistryTypeNode>,
}

#[derive(InputObject, Clone)]
pub struct DocumentRegistryFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterDocumentRegistryTypeInput>,
    pub document_type: Option<EqualFilterStringInput>,
    pub document_context: Option<EqualFilterStringInput>,
    pub parent_id: Option<EqualFilterStringInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DocumentRegistrySortFieldInput {
    Type,
    DocumentType,
}

#[derive(InputObject)]
pub struct DocumentRegistrySortInput {
    /// Sort query result by `key`
    key: DocumentRegistrySortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

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

    pub async fn document_context(&self) -> &str {
        &self.document_registry.document_context
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
                &self.allowed_ctx,
                &self.document_registry.id,
            ))
            .await?
            .unwrap_or(vec![]);
        Ok(children
            .into_iter()
            .map(|document_registry| DocumentRegistryNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document_registry,
            })
            .collect())
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

impl DocumentRegistryFilterInput {
    pub fn to_domain(self) -> DocumentRegistryFilter {
        let DocumentRegistryFilterInput {
            id,
            r#type,
            document_type,
            document_context,
            parent_id,
        } = self;
        DocumentRegistryFilter {
            id: id.map(EqualFilter::from),
            document_type: document_type.map(EqualFilter::from),
            document_context: document_context.map(EqualFilter::from),
            r#type: r#type.map(|t| map_filter!(t, DocumentRegistryTypeNode::to_domain)),
            parent_id: parent_id.map(EqualFilter::from),
        }
    }
}

impl DocumentRegistrySortInput {
    pub fn to_domain(self) -> DocumentRegistrySort {
        let key = match self.key {
            DocumentRegistrySortFieldInput::Type => DocumentRegistrySortField::Type,
            DocumentRegistrySortFieldInput::DocumentType => DocumentRegistrySortField::DocumentType,
        };

        DocumentRegistrySort {
            key,
            desc: self.desc,
        }
    }
}
