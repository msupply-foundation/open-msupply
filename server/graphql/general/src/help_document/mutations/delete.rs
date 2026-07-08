use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    help_document::{DeleteHelpDocument, DeleteHelpDocumentError as ServiceError},
};

#[derive(InputObject)]
pub struct DeleteHelpDocumentInput {
    pub id: String,
}

#[derive(SimpleObject)]
pub struct DeleteHelpDocumentError {
    pub error: DeleteHelpDocumentErrorInterface,
}

#[derive(Union)]
pub enum DeleteHelpDocumentResponse {
    Error(DeleteHelpDocumentError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteHelpDocumentErrorInterface {
    RecordNotFound(RecordNotFound),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn delete_help_document(
    ctx: &Context<'_>,
    input: DeleteHelpDocumentInput,
) -> Result<DeleteHelpDocumentResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateHelpDocuments,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .help_document_service
        .delete_help_document(&service_context, DeleteHelpDocument { id: input.id });

    map_response(result)
}

fn map_response(from: Result<String, ServiceError>) -> Result<DeleteHelpDocumentResponse> {
    let result = match from {
        Ok(id) => DeleteHelpDocumentResponse::Response(DeleteResponse(id)),
        Err(error) => DeleteHelpDocumentResponse::Error(DeleteHelpDocumentError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteHelpDocumentErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::HelpDocumentDoesNotExist => {
            return Ok(DeleteHelpDocumentErrorInterface::RecordNotFound(
                RecordNotFound,
            ))
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
