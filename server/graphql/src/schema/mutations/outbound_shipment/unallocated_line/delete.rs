use async_graphql::*;
use service::invoice_line::{
    DeleteOutboundShipmentUnallocatedLine as ServiceInput,
    DeleteOutboundShipmentUnallocatedLineError as ServiceError,
};

use crate::{
    schema::mutations::{DeleteResponse, RecordDoesNotExist},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

#[derive(InputObject)]
pub struct DeleteOutboundShipmentUnallocatedLineInput {
    pub id: String,
}

use DeleteOutboundShipmentUnallocatedLineInput as Input;

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteOutboundShipmentUnallocatedLineInterface {
    RecordDoesNotExist(RecordDoesNotExist),
}

use DeleteOutboundShipmentUnallocatedLineInterface as ErrorInterface;

#[derive(SimpleObject)]
pub struct DeleteOutboundShipmentUnallocatedLineError {
    pub error: ErrorInterface,
}

use DeleteOutboundShipmentUnallocatedLineError as Error;

#[derive(Union)]
pub enum DeleteOutboundShipmentUnallocatedLineResponse {
    Error(Error),
    Response(DeleteResponse),
}

use DeleteOutboundShipmentUnallocatedLineResponse as Response;

impl From<Input> for ServiceInput {
    fn from(Input { id }: Input) -> Self {
        ServiceInput { id }
    }
}

pub fn delete_outbound_shipment_unallocated_line(
    ctx: &Context<'_>,
    input: Input,
) -> Result<Response> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .outbound_shipment_line
        .delete_outbound_shipment_unallocated_line(&service_context, input.into())
    {
        Ok(id) => Response::Response(DeleteResponse(id)),
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
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
