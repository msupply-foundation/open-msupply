use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, RecordDoesNotExist},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::RequisitionLineConnector;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        UseSuggestedQuantity as ServiceInput, UseSuggestedQuantityError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct UseSuggestedQuantityInput {
    pub request_requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "UseSuggestedQuantityErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UseSuggestedQuantityError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UseSuggestedQuantityResponse")]
pub enum UseSuggestedQuantityResponse {
    Error(DeleteError),
    Response(RequisitionLineConnector),
}

pub fn use_suggested_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: UseSuggestedQuantityInput,
) -> Result<UseSuggestedQuantityResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::EditRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.requisition_service.use_suggested_quantity(
        &service_context,
        store_id,
        input.to_domain(),
    ) {
        Ok(requisition_lines) => UseSuggestedQuantityResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => UseSuggestedQuantityResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UseSuggestedQuantityInput {
    fn to_domain(self) -> ServiceInput {
        let UseSuggestedQuantityInput {
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
