use async_graphql::*;
use service::invoice_line::{
    InsertOutboundShipmentUnallocatedLine as ServiceInput,
    InsertOutboundShipmentUnallocatedLineError as ServiceError,
};

use crate::{
    schema::{
        mutations::{ForeignKey, ForeignKeyError},
        types::InvoiceLineNode,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

#[derive(InputObject)]
pub struct InsertOutboundShipmentUnallocatedLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub quantity: u32,
}

use InsertOutboundShipmentUnallocatedLineInput as Input;

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertOutboundShipmentUnallocatedLineInterface {
    ForeignKeyError(ForeignKeyError),
    UnallocatedLinesOnlyEditableInNewInvoice(UnallocatedLinesOnlyEditableInNewInvoice),
    UnallocatedLineForItemAlreadyExists(UnallocatedLineForItemAlreadyExists),
}

use InsertOutboundShipmentUnallocatedLineInterface as ErrorInterface;

#[derive(SimpleObject)]
pub struct InsertOutboundShipmentUnallocatedLineError {
    pub error: ErrorInterface,
}

use InsertOutboundShipmentUnallocatedLineError as Error;

#[derive(Union)]
pub enum InsertOutboundShipmentUnallocatedLineResponse {
    Error(Error),
    Response(InvoiceLineNode),
}

use InsertOutboundShipmentUnallocatedLineResponse as Response;

use super::{UnallocatedLineForItemAlreadyExists, UnallocatedLinesOnlyEditableInNewInvoice};

impl From<Input> for ServiceInput {
    fn from(
        Input {
            id,
            invoice_id,
            item_id,
            quantity,
        }: Input,
    ) -> Self {
        ServiceInput {
            id,
            invoice_id,
            item_id,
            quantity,
        }
    }
}

pub fn insert_outbound_shipment_unallocated_line(
    ctx: &Context<'_>,
    input: Input,
) -> Result<Response> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .outbound_shipment_line
        .insert_outbound_shipment_unallocated_line(&service_context, input.into())
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
        ServiceError::InvoiceDoesNotExist => {
            return Ok(ErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CanOnlyAddLinesToNewOutboundShipment => {
            return Ok(ErrorInterface::UnallocatedLinesOnlyEditableInNewInvoice(
                UnallocatedLinesOnlyEditableInNewInvoice {},
            ))
        }
        ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice => {
            return Ok(ErrorInterface::UnallocatedLineForItemAlreadyExists(
                UnallocatedLineForItemAlreadyExists {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAStockItem => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
