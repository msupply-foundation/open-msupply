use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_request::delete::DeletePrescriptionRequestError as ServiceError;

#[derive(Union)]
#[graphql(name = "DeletePrescriptionRequestResponse")]
pub enum DeleteResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_prescription_request(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescriptionRequest,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_delete_response(
        service_provider
            .prescription_request_service
            .delete_prescription_request(&service_context, store_id, id),
    )
}

pub fn map_delete_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    match from {
        Ok(id) => Ok(DeleteResponse::Response(GenericDeleteResponse(id))),
        Err(error) => Err(map_error(error)),
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        ServiceError::PrescriptionRequestDoesNotExist
        | ServiceError::NotThisStorePrescriptionRequest
        | ServiceError::NotEditable => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
