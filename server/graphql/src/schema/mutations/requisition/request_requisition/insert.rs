use crate::{
    schema::{
        mutations::OtherPartyNotASupplier,
        types::{NameNode, RequisitionNode},
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use async_graphql::*;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        InsertRequestRequisition as ServiceInput, InsertRequestRequisitionError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertRequestRequisitionInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
}

#[derive(Interface)]
#[graphql(name = "InsertRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRequestRequisitionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRequestRequisitionResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionNode),
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
        .requisition_service
        .insert_request_requisition(&service_context, store_id, input.to_domain())
    {
        Ok(requisition) => InsertResponse::Response(RequisitionNode::from_domain(requisition)),
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
            other_party_id,
            colour,
            their_reference,
            comment,
            max_months_of_stock,
            min_months_of_stock,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            colour,
            their_reference,
            comment,
            max_months_of_stock,
            min_months_of_stock,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotASupplier(name) => {
            return Ok(InsertErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier(NameNode { name }),
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::OtherPartyIsThisStore => BadUserInput(formatted_error),
        ServiceError::OtherPartyIsNotAStore => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
