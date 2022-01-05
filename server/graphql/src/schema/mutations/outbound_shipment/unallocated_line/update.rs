use async_graphql::*;
use service::invoice_line::{
    UpdateOutboundShipmentUnallocatedLine as ServiceInput,
    UpdateOutboundShipmentUnallocatedLineError as ServiceError,
};

use crate::{
    schema::{mutations::RecordDoesNotExist, types::InvoiceLineNode},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

#[derive(InputObject)]
pub struct UpdateOutboundShipmentUnallocatedLineInput {
    pub id: String,
    pub quantity: u32,
}

use UpdateOutboundShipmentUnallocatedLineInput as Input;

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateOutboundShipmentUnallocatedLineInterface {
    RecordDoesNotExist(RecordDoesNotExist),
}

use UpdateOutboundShipmentUnallocatedLineInterface as ErrorInterface;

#[derive(SimpleObject)]
pub struct UpdateOutboundShipmentUnallocatedLineError {
    pub error: ErrorInterface,
}

use UpdateOutboundShipmentUnallocatedLineError as Error;

#[derive(Union)]
pub enum UpdateOutboundShipmentUnallocatedLineResponse {
    Error(Error),
    Response(InvoiceLineNode),
}

use UpdateOutboundShipmentUnallocatedLineResponse as Response;

impl From<Input> for ServiceInput {
    fn from(Input { id, quantity }: Input) -> Self {
        ServiceInput { id, quantity }
    }
}

pub fn update_outbound_shipment_unallocated_line(
    ctx: &Context<'_>,
    input: Input,
) -> Result<Response> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .outbound_shipment_line
        .update_outbound_shipment_unallocated_line(&service_context, input.into())
    {
        Ok(invoice_line) => Response::Response(invoice_line.into()),
        Err(error) => Response::Error(Error {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

pub fn map_error(error: ServiceError) -> Result<ErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(ErrorInterface::RecordDoesNotExist(RecordDoesNotExist {}))
        }
        // Standard Graphql Errors
        ServiceError::LineIsNotUnallocatedLine => BadUserInput(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
