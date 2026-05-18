use async_graphql::*;
use graphql_core::generic_filters::{
    DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
};
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::document::{DocumentConnector, DocumentNode};
use repository::{
    DatetimeFilter, DocumentFilter, DocumentSort, DocumentSortField, EqualFilter, PaginationOption,
    RepositoryError, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::ListError;

#[derive(Union)]
pub enum DocumentResponse {
    Response(DocumentConnector),
}

#[derive(InputObject, Clone)]
pub struct DocumentFilterInput {
    pub name: Option<StringFilterInput>,
    pub r#type: Option<EqualFilterStringInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub owner: Option<EqualFilterStringInput>,
    pub context_id: Option<EqualFilterStringInput>,
    /// This filter makes it possible to search the raw text json data.
    /// Be beware of potential performance issues.
    pub data: Option<StringFilterInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::document::DocumentSortField")]
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
            id: None,
            name: self.name.map(StringFilter::from),
            r#type: self.r#type.map(EqualFilter::from),
            datetime: self.datetime.map(DatetimeFilter::from),
            owner: self.owner.map(EqualFilter::from),
            context_id: self.context_id.map(EqualFilter::from),
            data: self.data.map(StringFilter::from),
        }
    }
}

impl DocumentSortInput {
    pub fn to_domain(self) -> DocumentSort {
        DocumentSort {
            key: DocumentSortField::from(self.key),
            desc: self.desc,
        }
    }
}

pub async fn document(
    ctx: &Context<'_>,
    store_id: String,
    name: String,
) -> Result<Option<DocumentNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let node = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        Ok(service_provider
            .document_service
            .document(&context, &name, Some(&allowed_ctx))?
            .map(|document| DocumentNode {
                allowed_ctx: allowed_ctx.clone(),
                document,
            }))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(node)
}

pub async fn documents(
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
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let filter = filter.map(|f| f.to_domain_filter());

    let connector = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.basic_context()?;
        let result = service_provider.document_service.documents(
            &context,
            page.map(PaginationOption::from),
            filter,
            sort.map(DocumentSortInput::to_domain),
            Some(&allowed_ctx),
        )?;
        Ok(DocumentConnector {
            total_count: result.count,
            nodes: result
                .rows
                .into_iter()
                .map(|document| DocumentNode {
                    allowed_ctx: allowed_ctx.clone(),
                    document,
                })
                .collect(),
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(DocumentResponse::Response(connector))
}
