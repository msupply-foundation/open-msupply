use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    DocumentRegistryFilter, DocumentRegistrySort, DocumentRegistrySortField, EqualFilter,
};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};
use service::usize_to_u32;

use crate::types::document_registry::{
    DocumentRegistryConnector, DocumentRegistryNode, DocumentRegistryNodeContext,
};

#[derive(InputObject, Clone)]
pub struct EqualFilterDocumentRegistryContextInput {
    pub equal_to: Option<DocumentRegistryNodeContext>,
    pub equal_any: Option<Vec<DocumentRegistryNodeContext>>,
    pub not_equal_to: Option<DocumentRegistryNodeContext>,
}

#[derive(InputObject, Clone)]
pub struct DocumentRegistryFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub document_type: Option<EqualFilterStringInput>,
    pub context: Option<EqualFilterDocumentRegistryContextInput>,
    pub parent_id: Option<EqualFilterStringInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum DocumentRegistrySortFieldInput {
    DocumentType,
    Context,
}

#[derive(InputObject)]
pub struct DocumentRegistrySortInput {
    /// Sort query result by `key`
    key: DocumentRegistrySortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(Union)]
pub enum DocumentRegistryResponse {
    Response(DocumentRegistryConnector),
}

pub fn document_registries(
    ctx: &Context<'_>,
    filter: Option<DocumentRegistryFilterInput>,
    sort: Option<Vec<DocumentRegistrySortInput>>,
) -> Result<DocumentRegistryResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocumentRegistry,
            store_id: None,
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

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
            &allowed_docs,
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
                    allowed_docs: allowed_docs.clone(),
                    document_registry,
                })
                .collect(),
        },
    ))
}

impl DocumentRegistryFilterInput {
    pub fn to_domain(self) -> DocumentRegistryFilter {
        DocumentRegistryFilter {
            id: self.id.map(EqualFilter::from),
            document_type: self.document_type.map(EqualFilter::from),
            context: self
                .context
                .map(|t| map_filter!(t, DocumentRegistryNodeContext::to_domain)),
            parent_id: self.parent_id.map(EqualFilter::from),
        }
    }
}

impl DocumentRegistrySortInput {
    pub fn to_domain(self) -> DocumentRegistrySort {
        let key = match self.key {
            DocumentRegistrySortFieldInput::Context => DocumentRegistrySortField::Context,
            DocumentRegistrySortFieldInput::DocumentType => DocumentRegistrySortField::DocumentType,
        };

        DocumentRegistrySort {
            key,
            desc: self.desc,
        }
    }
}
