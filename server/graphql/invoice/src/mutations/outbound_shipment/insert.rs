use super::OtherPartyNotACustomerError;
use async_graphql::*;
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::{InvoiceNode, NameNode};
use service::invoice::outbound_shipment::{
    InsertOutboundShipment as ServiceInput, InsertOutboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentInput")]
pub struct InsertInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// The other party must be an customer of the current store
    other_party_id: String,
    on_hold: Option<bool>,
    comment: Option<String>,
    their_reference: Option<String>,
    colour: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.invoice_service.insert_outbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    ) {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
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
            on_hold,
            comment,
            their_reference,
            colour,
        }: InsertInput = self;

        ServiceInput {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotACustomer(name) => {
            return Ok(InsertErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomerError(NameNode { name }),
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyCannotBeThisStore => BadUserInput(formatted_error),
        ServiceError::OtherPartyIdNotFound(_) => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
