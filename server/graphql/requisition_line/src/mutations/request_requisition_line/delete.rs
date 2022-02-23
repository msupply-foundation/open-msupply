use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        CannotEditRequisition, ForeignKey, ForeignKeyError, RecordDoesNotExist,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{DeleteResponse as GenericDeleteResponse, RequisitionLineNode};
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition_line::request_requisition_line::{
        DeleteRequestRequisitionLine as ServiceInput,
        DeleteRequestRequisitionLineError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "DeleteRequestRequisitionLineInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteRequestRequisitionLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteRequestRequisitionLineResponse")]
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
        .requisition_line_service
        .delete_request_requisition_line(&service_context, store_id, input.to_domain())
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
        ServiceError::RequisitionLineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(DeleteErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::RequisitionDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
