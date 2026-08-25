use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_order::delete::DeletePrescriptionOrderError as ServiceError;

#[derive(Union)]
#[graphql(name = "DeletePrescriptionOrderResponse")]
pub enum DeleteResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_prescription_order(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .prescription_order_service
        .delete_prescription_order(&service_context, store_id, id)
    {
        Ok(id) => Ok(DeleteResponse::Response(GenericDeleteResponse(id))),
        Err(error) => Err(map_error(error)),
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        ServiceError::PrescriptionOrderDoesNotExist
        | ServiceError::NotThisStorePrescriptionOrder
        | ServiceError::NotEditable => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
