use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::Permission;
use service::auth::{context_permissions, Resource, ResourceAccessRequest};
use service::document::document_service::{DocumentUndelete, DocumentUndeleteError};

use crate::types::document::DocumentNode;

#[derive(InputObject)]
pub struct UndeleteDocumentInput {
    pub id: String,
}

#[derive(Union)]
pub enum UndeleteDocumentResponse {
    Response(DocumentNode),
}

pub fn undelete_document(
    ctx: &Context<'_>,
    store_id: String,
    input: UndeleteDocumentInput,
) -> Result<UndeleteDocumentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_docs = context_permissions(Permission::DocumentMutate, &user.permissions);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let response = match service_provider.document_service.undelete_document(
        &context,
        &user.user_id,
        DocumentUndelete {
            id: input.id.clone(),
        },
        &allowed_docs,
    ) {
        Ok(document) => UndeleteDocumentResponse::Response(DocumentNode {
            allowed_docs,
            document,
        }),
        Err(error) => {
            let formatted_error = format!("{:?}", error);
            let graphql_error = match error {
                DocumentUndeleteError::NotAllowedToMutDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                DocumentUndeleteError::DocumentNotFound => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DocumentUndeleteError::CannotUndeleteActiveDocument => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DocumentUndeleteError::ParentDoesNotExist => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                DocumentUndeleteError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                DocumentUndeleteError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };
    Ok(response)
}
