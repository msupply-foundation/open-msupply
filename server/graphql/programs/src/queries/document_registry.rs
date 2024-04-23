use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::document_registry::{
    DocumentRegistryCategoryNode, DocumentRegistryConnector, DocumentRegistryNode,
};
use repository::{
    DocumentRegistryFilter, DocumentRegistrySort, DocumentRegistrySortField, EqualFilter,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::usize_to_u32;

#[derive(Union)]
pub enum DocumentRegistryResponse {
    Response(DocumentRegistryConnector),
}

#[derive(InputObject, Clone)]
pub struct EqualFilterDocumentRegistryCategoryInput {
    pub equal_to: Option<DocumentRegistryCategoryNode>,
    pub equal_any: Option<Vec<DocumentRegistryCategoryNode>>,
    pub not_equal_to: Option<DocumentRegistryCategoryNode>,
}

#[derive(InputObject, Clone)]
pub struct DocumentRegistryFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub category: Option<EqualFilterDocumentRegistryCategoryInput>,
    pub document_type: Option<EqualFilterStringInput>,
    pub context_id: Option<EqualFilterStringInput>,
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

pub fn document_registries(
    ctx: &Context<'_>,
    filter: Option<DocumentRegistryFilterInput>,
    sort: Option<Vec<DocumentRegistrySortInput>>,
    store_id: String,
) -> Result<DocumentRegistryResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocumentRegistry,
            store_id: Some(store_id),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter.map(|f| f.to_domain()).unwrap_or_default();

    let entries = service_provider
        .document_registry_service
        .get_entries(
            &context,
            Some(filter),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
            allowed_ctx,
        )
        .map_err(|err| {
            let formatted_err = format! {"{:?}", err};
            StandardGraphqlError::InternalError(formatted_err).extend()
        })?;
    Ok(DocumentRegistryResponse::Response(
        DocumentRegistryConnector {
            total_count: usize_to_u32(entries.len()),
            nodes: entries
                .into_iter()
                .map(|document_registry| DocumentRegistryNode {
                    allowed_ctx: allowed_ctx.clone(),
                    document_registry,
                })
                .collect(),
        },
    ))
}

impl DocumentRegistryFilterInput {
    pub fn to_domain(self) -> DocumentRegistryFilter {
        let DocumentRegistryFilterInput {
            id,
            category: r#type,
            document_type,
            context_id,
        } = self;
        DocumentRegistryFilter {
            id: id.map(EqualFilter::from),
            document_type: document_type.map(EqualFilter::from),
            context_id: context_id.map(EqualFilter::from),
            category: r#type.map(|t| map_filter!(t, DocumentRegistryCategoryNode::to_domain)),
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
