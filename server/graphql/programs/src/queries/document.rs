use async_graphql::*;
use graphql_core::generic_filters::{
    DatetimeFilterInput, EqualFilterStringInput, SimpleStringFilterInput,
};
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{
    DatetimeFilter, DocumentFilter, DocumentSort, DocumentSortField, EqualFilter, PaginationOption,
    SimpleStringFilter,
};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};

use crate::types::document::{DocumentConnector, DocumentNode};

#[derive(Union)]
pub enum DocumentResponse {
    Response(DocumentConnector),
}

#[derive(InputObject, Clone)]
pub struct DocumentFilterInput {
    pub name: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub owner: Option<EqualFilterStringInput>,
    pub context: Option<EqualFilterStringInput>,
    /// This filter makes it possible to search the raw text json data.
    /// Be beware of potential performance issues.
    pub data: Option<SimpleStringFilterInput>,
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
    fn to_domain_filter(self) -> DocumentFilter {
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
            data: self.data.map(SimpleStringFilter::from),
        }
    }
}

pub fn document(ctx: &Context<'_>, store_id: String, name: String) -> Result<Option<DocumentNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let node = service_provider
        .document_service
        .document(&context, &name, Some(&allowed_docs))?
        .map(|document| DocumentNode {
            allowed_docs: allowed_docs.clone(),
            document,
        });

    Ok(node)
}

pub fn documents(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<DocumentFilterInput>,
    sort: Option<DocumentSortInput>,
) -> Result<DocumentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter.map(|f| f.to_domain_filter());

    let result = service_provider
        .document_service
        .documents(
            &context,
            page.map(PaginationOption::from),
            filter,
            sort.map(DocumentSortInput::to_domain),
            Some(&allowed_docs),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(DocumentResponse::Response(DocumentConnector {
        total_count: result.count,
        nodes: result
            .rows
            .into_iter()
            .map(|document| DocumentNode {
                allowed_docs: allowed_docs.clone(),
                document,
            })
            .collect(),
    }))
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
