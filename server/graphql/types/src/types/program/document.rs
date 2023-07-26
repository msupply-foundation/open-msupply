use async_graphql::*;
use async_graphql::{dataloader::DataLoader, Context};
use chrono::{DateTime, Utc};

use graphql_core::generic_filters::{
    DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
};
use graphql_core::loader::{
    DocumentRegistryLoader, DocumentRegistryLoaderInput, JsonSchemaLoader, UserLoader,
};
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{
    unknown_user, DatetimeFilter, Document, DocumentFilter, DocumentSort, DocumentSortField,
    EqualFilter, StringFilter,
};
use service::document::raw_document::RawDocument;

use crate::types::{JSONSchemaNode, UserNode};

use super::document_registry::DocumentRegistryNode;

#[derive(InputObject, Clone)]
pub struct DocumentFilterInput {
    pub name: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub owner: Option<EqualFilterStringInput>,
    pub context: Option<EqualFilterStringInput>,
    /// This filter makes it possible to search the raw text json data.
    /// Be beware of potential performance issues.
    pub data: Option<StringFilterInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DocumentSortFieldInput {
    Name,
    Type,
    Owner,
    Context,
    Datetime,
}

#[derive(InputObject)]
pub struct DocumentSortInput {
    /// Sort query result by `key`
    key: DocumentSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl DocumentFilterInput {
    pub fn to_domain_filter(self) -> DocumentFilter {
        DocumentFilter {
            name: self.name.map(|f| repository::StringFilter {
                equal_to: f.equal_to,
                not_equal_to: f.not_equal_to,
                equal_any: f.equal_any,
                not_equal_all: None,
                like: None,
                starts_with: None,
                ends_with: None,
            }),
            r#type: self.r#type.map(EqualFilter::from),
            datetime: self.datetime.map(DatetimeFilter::from),
            owner: self.owner.map(EqualFilter::from),
            context: self.context.map(EqualFilter::from),
            data: self.data.map(StringFilter::from),
        }
    }
}

impl DocumentSortInput {
    pub fn to_domain(self) -> DocumentSort {
        let key = match self.key {
            DocumentSortFieldInput::Name => DocumentSortField::Name,
            DocumentSortFieldInput::Type => DocumentSortField::Type,
            DocumentSortFieldInput::Owner => DocumentSortField::Owner,
            DocumentSortFieldInput::Context => DocumentSortField::Context,
            DocumentSortFieldInput::Datetime => DocumentSortField::Datetime,
        };

        DocumentSort {
            key,
            desc: self.desc,
        }
    }
}

pub struct DocumentNode {
    pub allowed_ctx: Vec<String>,
    pub document: Document,
}

#[Object]
impl DocumentNode {
    pub async fn id(&self) -> &str {
        &self.document.id
    }

    pub async fn name(&self) -> &str {
        &self.document.name
    }

    pub async fn parents(&self) -> &[String] {
        &self.document.parent_ids
    }

    pub async fn user_id(&self) -> &str {
        &self.document.user_id
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<UserNode> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user = loader
            .load_one(self.document.user_id.clone())
            .await?
            .unwrap_or(unknown_user());

        Ok(UserNode::from_domain(user))
    }

    pub async fn timestamp(&self) -> &DateTime<Utc> {
        &self.document.datetime
    }

    pub async fn r#type(&self) -> &str {
        &self.document.r#type
    }

    pub async fn data(&self) -> &serde_json::Value {
        &self.document.data
    }

    pub async fn schema(&self, ctx: &Context<'_>) -> Result<Option<JSONSchemaNode>> {
        Ok(match &self.document.form_schema_id {
            Some(schema_id) => {
                let loader = ctx.get_loader::<DataLoader<JsonSchemaLoader>>();
                let schema = loader.load_one(schema_id.clone()).await?.ok_or(
                    StandardGraphqlError::InternalError(format!(
                        "Cannot find schema {}",
                        schema_id
                    ))
                    .extend(),
                )?;
                Some(JSONSchemaNode { schema })
            }
            None => None,
        })
    }

    pub async fn document_registry(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<DocumentRegistryNode>> {
        let loader = ctx.get_loader::<DataLoader<DocumentRegistryLoader>>();
        let document_registry = loader
            .load_one(DocumentRegistryLoaderInput::new(
                &self.allowed_ctx,
                &self.document.r#type,
            ))
            .await?;
        Ok(
            document_registry.map(|document_registry| DocumentRegistryNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document_registry,
            }),
        )
    }
}

#[derive(SimpleObject)]
pub struct DocumentConnector {
    pub total_count: u32,
    pub nodes: Vec<DocumentNode>,
}

pub struct RawDocumentNode {
    pub document: RawDocument,
}

#[Object]
impl RawDocumentNode {
    pub async fn name(&self) -> &str {
        &self.document.name
    }

    pub async fn parents(&self) -> &[String] {
        &self.document.parents
    }

    pub async fn author(&self) -> &str {
        &self.document.author
    }

    pub async fn timestamp(&self) -> &DateTime<Utc> {
        &self.document.datetime
    }

    pub async fn r#type(&self) -> &str {
        &self.document.r#type
    }

    pub async fn data(&self) -> Result<String> {
        Ok(serde_json::to_string(&self.document.data).map_err(|e| {
            StandardGraphqlError::InternalError(format!("Failed to stringify json value: {}", e))
                .extend()
        })?)
    }

    pub async fn schema_id(&self) -> &Option<String> {
        &self.document.form_schema_id
    }
}
