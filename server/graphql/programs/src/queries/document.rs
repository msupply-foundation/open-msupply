use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{DocumentFilter, EqualFilter, StringFilter};
use service::auth::{Resource, ResourceAccessRequest};
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

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let node = service_provider
        .document_service
        .get_documents(
            &context,
            Some(
                DocumentFilter::new()
                    .name(StringFilter::equal_to(&name))
                    .r#type(EqualFilter::equal_any(
                        user.context.iter().map(String::clone).collect(),
                    )),
            ),
        )?
        .into_iter()
        .map(|document| DocumentNode { document })
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

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter
        .map(|f| {
            f.to_domain_filter().r#type(EqualFilter::equal_any(
                user.context.iter().map(String::clone).collect(),
            ))
        })
        .unwrap_or(DocumentFilter::new().r#type(EqualFilter::equal_any(
            user.context.iter().map(String::clone).collect(),
        )));

    let nodes: Vec<DocumentNode> = service_provider
        .document_service
        .get_documents(&context, Some(filter))?
        .into_iter()
        .into_iter()
        .map(|document| DocumentNode { document })
        .collect();

    Ok(DocumentResponse::Response(DocumentConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}
