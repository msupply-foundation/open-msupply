use async_graphql::*;
use service::{
    auth::{CapabilityTag, Resource, ResourceAccessRequest},
    document::document_registry::{InsertDocRegistryError, InsertDocumentRegistry},
};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use crate::types::document_registry::{DocumentRegistryNode, DocumentRegistryTypeNode};

#[derive(InputObject)]
pub struct InsertDocumentRegistryInput {
    pub id: String,
    pub parent_id: Option<String>,
    pub document_type: String,
    pub document_context: String,
    pub r#type: DocumentRegistryTypeNode,
    pub name: Option<String>,
    pub form_schema_id: String,
}

#[derive(Union)]
pub enum InsertDocumentResponse {
    Response(DocumentRegistryNode),
}

pub fn insert_document_registry(
    ctx: &Context<'_>,
    input: InsertDocumentRegistryInput,
) -> Result<InsertDocumentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDocumentRegistry,
            store_id: None,
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let response = match service_provider.document_registry_service.insert(
        &context,
        to_domain(input),
        &allowed_ctx,
    ) {
        Ok(document_registry) => InsertDocumentResponse::Response(DocumentRegistryNode {
            allowed_ctx: allowed_ctx.clone(),
            document_registry,
        }),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                InsertDocRegistryError::NotAllowedToMutateDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                InsertDocRegistryError::OnlyOnePatientEntryAllowed => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertDocRegistryError::InvalidParent => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertDocRegistryError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertDocRegistryError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertDocRegistryError::RepositoryError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };
    Ok(response)
}

fn to_domain(
    InsertDocumentRegistryInput {
        id,
        parent_id,
        document_type,
        document_context,
        r#type,
        name,
        form_schema_id,
    }: InsertDocumentRegistryInput,
) -> InsertDocumentRegistry {
    InsertDocumentRegistry {
        id,
        parent_id,
        document_type,
        document_context,
        r#type: r#type.to_domain(),
        name,
        form_schema_id,
    }
}
