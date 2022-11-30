use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterStringInput, SimpleStringFilterInput};
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{DocumentFilter, EqualFilter, SimpleStringFilter, StringFilter};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};
use service::usize_to_u32;

use crate::types::document::{DocumentConnector, DocumentNode};

#[derive(Union)]
pub enum DocumentResponse {
    Response(DocumentConnector),
}

#[derive(InputObject, Clone)]
pub struct DocumentFilterInput {
    pub name: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
    pub owner: Option<EqualFilterStringInput>,
    pub context: Option<EqualFilterStringInput>,
    /// This filter makes it possible to search the raw text json data.
    /// Be beware of potential performance issues.
    pub data: Option<SimpleStringFilterInput>,
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
        .get_documents(
            &context,
            Some(DocumentFilter::new().name(StringFilter::equal_to(&name))),
            Some(&allowed_docs),
        )?
        .into_iter()
        .map(|document| DocumentNode {
            allowed_docs: allowed_docs.clone(),
            document,
        })
        .next();

    Ok(node)
}

pub fn documents(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<DocumentFilterInput>,
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

    let nodes: Vec<DocumentNode> = service_provider
        .document_service
        .get_documents(&context, filter, Some(&allowed_docs))?
        .into_iter()
        .into_iter()
        .map(|document| DocumentNode {
            allowed_docs: allowed_docs.clone(),
            document,
        })
        .collect();

    Ok(DocumentResponse::Response(DocumentConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}
