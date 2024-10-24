use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::response_requisition_line::{
        DeleteResponseRequisitionLine as ServiceInput,
        DeleteResponseRequisitionLineError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "DeleteResponseRequisitionLineInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteResponseRequisitionLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteResponseRequisitionLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteResponseRequisitionLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .requisition_line_service
            .delete_response_requisition_line(&service_context, input.to_domain()),
    )
}

impl DeleteInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id }
    }
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionLineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::RequisitionDoesNotExist => {
            return Ok(DeleteErrorInterface::RequisitionDoesNotExist(
                ForeignKeyError(ForeignKey::RequisitionId),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
