use crate::{
    schema::{
        mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
        types::RequisitionLineConnector,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        UseCalculatedQuantity as ServiceInput, UseCalculatedQuantityError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct UseCalculatedQuantityInput {
    pub request_requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "UseCalculatedQuantityErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UseCalculatedQuantityError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UseCalculatedQuantityResponse")]
pub enum UseCalculatedQuantityResponse {
    Error(DeleteError),
    Response(RequisitionLineConnector),
}

pub fn use_calculated_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: UseCalculatedQuantityInput,
) -> Result<UseCalculatedQuantityResponse> {
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
        .use_calculated_quantity(&service_context, store_id, input.to_domain())
    {
        Ok(requisition_lines) => UseCalculatedQuantityResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => UseCalculatedQuantityResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UseCalculatedQuantityInput {
    fn to_domain(self) -> ServiceInput {
        let UseCalculatedQuantityInput {
            request_requisition_id,
        } = self;
        ServiceInput {
            request_requisition_id,
        }
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
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
