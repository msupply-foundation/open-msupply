use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::document_registry::{
    DocumentRegistryConnector, DocumentRegistryNode, DocumentRegistryTypeNode,
};
use repository::{
    DocumentRegistryFilter, DocumentRegistrySort, DocumentRegistrySortField, EqualFilter,
};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};
use service::usize_to_u32;

#[derive(Union)]
pub enum DocumentRegistryResponse {
    Response(DocumentRegistryConnector),
}

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
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter
        .map(|f| f.to_domain())
        .unwrap_or(DocumentRegistryFilter::new());

    let entries = service_provider
        .document_registry_service
        .get_entries(
            &context,
            Some(filter),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
            &allowed_ctx,
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
