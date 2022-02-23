use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{InternalError, RecordDoesNotExist, CannotEditRequisition},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        CreateRequisitionShipment as ServiceInput, CreateRequisitionShipmentError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct CreateRequisitionShipmentInput {
    pub response_requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "CreateRequisitionShipmentErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    NothingRemainingToSupply(NothingRemainingToSupply),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "CreateRequisitionShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "CreateRequisitionShipmentResponse")]
pub enum CreateRequisitionShipmentResponse {
    Error(DeleteError),
    Response(InvoiceNode),
}

pub fn create_requisition_shipment(
    ctx: &Context<'_>,
    store_id: &str,
    input: CreateRequisitionShipmentInput,
) -> Result<CreateRequisitionShipmentResponse> {
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
        .create_requisition_shipment(&service_context, store_id, input.to_domain())
    {
        Ok(invoice) => {
            CreateRequisitionShipmentResponse::Response(InvoiceNode::from_domain(invoice))
        }
        Err(error) => CreateRequisitionShipmentResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl CreateRequisitionShipmentInput {
    fn to_domain(self) -> ServiceInput {
        let CreateRequisitionShipmentInput {
            response_requisition_id,
        } = self;
        ServiceInput {
            response_requisition_id,
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
        ServiceError::NothingRemainingToSupply => {
            return Ok(DeleteErrorInterface::NothingRemainingToSupply(
                NothingRemainingToSupply {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::CreatedInvoiceDoesNotExist => InternalError(formatted_error),
        ServiceError::ProblemGettingOtherParty => InternalError(formatted_error),
        ServiceError::ProblemFindingItem => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct NothingRemainingToSupply;
#[Object]
impl NothingRemainingToSupply {
    pub async fn description(&self) -> &'static str {
        "Requisition is fulfilled, check associated invoices and supply quantity"
    }
}
