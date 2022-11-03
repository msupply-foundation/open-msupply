use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use repository::Permission;
use service::auth::{context_permissions, Resource, ResourceAccessRequest};
use service::document::document_service::{DocumentDelete, DocumentDeleteError};

#[derive(InputObject)]
pub struct DeleteDocumentInput {
    pub id: String,
    pub comment: Option<String>,
}

#[derive(Union)]
pub enum DeleteDocumentResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_document(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteDocumentInput,
) -> Result<DeleteDocumentResponse> {
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

    let response = match service_provider.document_service.delete_document(
        &context,
        &user.user_id,
        DocumentDelete {
            id: input.id.clone(),
            comment: input.comment,
        },
        &allowed_docs,
    ) {
        Ok(_) => DeleteDocumentResponse::Response(GenericDeleteResponse(input.id)),
        Err(error) => {
            let formatted_error = format!("{:?}", error);
            let graphql_error = match error {
                DocumentDeleteError::NotAllowedToMutDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                DocumentDeleteError::DocumentNotFound => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DocumentDeleteError::DocumentHasAlreadyBeenDeleted => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                DocumentDeleteError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                DocumentDeleteError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };
    Ok(response)
}
