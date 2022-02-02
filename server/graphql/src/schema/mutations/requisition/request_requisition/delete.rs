use crate::{
    schema::mutations::{
        requisition::errors::{CannotDeleteRequisitionWithLines, CannotEditRequisition},
        DeleteResponse as GenericDeleteResponse, RecordDoesNotExist,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        DeleteRequestRequisition as ServiceInput, DeleteRequestRequisitionError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "DeleteRequestRequisitionInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
    CannotDeleteRequisitionWithLines(CannotDeleteRequisitionWithLines),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteRequestRequisitionError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteRequestRequisitionResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::EditRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .requisition_service
        .delete_request_requisition(&service_context, store_id, input.to_domain())
    {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl DeleteInput {
    fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(DeleteErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        ServiceError::CannotDeleteRequisitionWithLines => {
            return Ok(DeleteErrorInterface::CannotDeleteRequisitionWithLines(
                CannotDeleteRequisitionWithLines {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
