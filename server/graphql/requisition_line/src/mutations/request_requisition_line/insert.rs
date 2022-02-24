use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition_line::request_requisition_line::{
        InsertRequestRequisitionLine as ServiceInput,
        InsertRequestRequisitionLineError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertRequestRequisitionLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub requested_quantity: Option<u32>,
}

#[derive(Interface)]
#[graphql(name = "InsertRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
    RequisitionLineWithItemIdExists(RequisitionLineWithItemIdExists),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRequestRequisitionLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRequestRequisitionLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionLineNode),
}
pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
        .insert_request_requisition_line(&service_context, store_id, input.to_domain())
    {
        Ok(requisition_line) => {
            InsertResponse::Response(RequisitionLineNode::from_domain(requisition_line))
        }
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl InsertInput {
    fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            item_id,
            requisition_id,
            requested_quantity,
        } = self;

        ServiceInput {
            id,
            item_id,
            requisition_id,
            requested_quantity,
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
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CannotFindItemStatusForRequisitionLine => InternalError(formatted_error),
        ServiceError::NewlyCreatedRequisitionLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
pub struct RequisitionLineWithItemIdExists;
#[Object]
impl RequisitionLineWithItemIdExists {
    pub async fn description(&self) -> &'static str {
        "Requisition line already exists for this item"
    }
}
