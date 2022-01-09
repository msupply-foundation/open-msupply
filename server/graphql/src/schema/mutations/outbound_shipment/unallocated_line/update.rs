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
#[graphql(name = "UpdateOutboundShipmentUnallocatedLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub quantity: u32,
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentUnallocatedLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentUnallocatedLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentUnallocatedLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

impl From<UpdateInput> for ServiceInput {
    fn from(UpdateInput { id, quantity }: UpdateInput) -> Self {
        ServiceInput { id, quantity }
    }
}

pub fn update(ctx: &Context<'_>, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .outbound_shipment_line
        .update_outbound_shipment_unallocated_line(&service_context, input.into())
    {
        Ok(invoice_line) => UpdateResponse::Response(invoice_line.into()),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::LineIsNotUnallocatedLine => BadUserInput(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
