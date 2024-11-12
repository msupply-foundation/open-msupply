use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineNode;
use repository::RequisitionLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::response_requisition_line::{
        InsertResponseRequisitionLine as ServiceInput,
        InsertResponseRequisitionLineError as ServiceError,
    },
};

use crate::mutations::errors::RequisitionLineWithItemIdExists;

#[derive(InputObject)]
#[graphql(name = "InsertResponseRequisitionLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "InsertResponseRequisitionLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
    RequisitionLineWithItemIdExists(RequisitionLineWithItemIdExists),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertResponseRequisitionLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertResponseRequisitionLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionLineNode),
}
pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .insert_response_requisition_line(&service_context, input.to_domain()),
    )
}

fn map_response(from: Result<RequisitionLine, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(requisition_line) => {
            InsertResponse::Response(RequisitionLineNode::from_domain(requisition_line))
        }
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            item_id,
            requisition_id,
        } = self;

        ServiceInput {
            id,
            item_id,
            requisition_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::ItemAlreadyExistInRequisition => {
            return Ok(InsertErrorInterface::RequisitionLineWithItemIdExists(
                RequisitionLineWithItemIdExists {},
            ))
        }
        ServiceError::RequisitionDoesNotExist => {
            return Ok(InsertErrorInterface::RequisitionDoesNotExist(
                ForeignKeyError(ForeignKey::RequisitionId),
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(InsertErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionLineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CannotAddItemToProgramRequisition => BadUserInput(formatted_error),
        ServiceError::CannotFindItemStatusForRequisitionLine => InternalError(formatted_error),
        ServiceError::NewlyCreatedRequisitionLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
