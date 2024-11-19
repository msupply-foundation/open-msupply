use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionNode;
use repository::Requisition;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        InsertProgramResponseRequisition, InsertProgramResponseRequisitionError as ServiceError,
    },
};

use crate::mutations::errors::MaxOrdersReachedForPeriod;

#[derive(InputObject)]
#[graphql(name = "InsertProgramResponseRequisitionInput")]
pub struct InsertProgramResponseRequisitionInput {
    pub id: String,
    pub other_party_id: String,
    pub program_order_type_id: String,
    pub period_id: String,
}

#[derive(Interface)]
#[graphql(name = "InsertProgramResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    MaxOrdersReachedForPeriod(MaxOrdersReachedForPeriod),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertProgramResponseRequisitionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertProgramResponseRequisitionResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionNode),
}

pub fn insert_program(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertProgramResponseRequisitionInput,
) -> Result<InsertResponse> {
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
            .requisition_service
            .insert_program_response_requisition(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Requisition, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(requisition) => InsertResponse::Response(RequisitionNode::from_domain(requisition)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::MaxOrdersReachedForPeriod => {
            return Ok(InsertErrorInterface::MaxOrdersReachedForPeriod(
                MaxOrdersReachedForPeriod,
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CustomerNotValid => BadUserInput(formatted_error),
        ServiceError::ProgramOrderTypeDoesNotExist => BadUserInput(formatted_error),

        ServiceError::NewlyCreatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl InsertProgramResponseRequisitionInput {
    pub fn to_domain(self) -> InsertProgramResponseRequisition {
        let InsertProgramResponseRequisitionInput {
            id,
            other_party_id,
            program_order_type_id,
            period_id,
        } = self;

        InsertProgramResponseRequisition {
            id,
            other_party_id,
            program_order_type_id,
            period_id,
        }
    }
}
