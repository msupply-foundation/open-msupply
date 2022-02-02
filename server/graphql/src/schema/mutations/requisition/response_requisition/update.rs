use crate::{
    schema::{
        mutations::{requisition::errors::CannotEditRequisition, RecordDoesNotExist},
        types::RequisitionNode,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        UpdateResponseRequisition as ServiceInput, UpdateResponseRequisitionError as ServiceError,
        UpdateResponseRequstionStatus,
    },
};

#[derive(InputObject)]
#[graphql(name = "UpdateResponseRequisitionInput")]
pub struct UpdateInput {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub status: Option<UpdateResponseRequisitionStatusInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateResponseRequisitionStatusInput {
    Finalised,
}

#[derive(Interface)]
#[graphql(name = "UpdateResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateResponseRequisitionError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateResponseRequisitionResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(RequisitionNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
        .update_response_requisition(&service_context, store_id, input.to_domain())
    {
        Ok(requisition) => UpdateResponse::Response(RequisitionNode::from_domain(requisition)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UpdateInput {
    fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            colour,
            their_reference,
            comment,
            status,
        } = self;

        ServiceInput {
            id,
            colour,
            their_reference,
            comment,
            status: status.map(|status| status.to_domain()),
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(UpdateErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::UpdatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateResponseRequisitionStatusInput {
    pub fn to_domain(self) -> UpdateResponseRequstionStatus {
        use UpdateResponseRequisitionStatusInput::*;
        match self {
            Finalised => UpdateResponseRequstionStatus::Finalised,
        }
    }
}
