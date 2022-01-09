use async_graphql::*;
use service::invoice_line::{
    DeleteOutboundShipmentUnallocatedLine as ServiceInput,
    DeleteOutboundShipmentUnallocatedLineError as ServiceError,
};

use crate::{
    schema::mutations::{DeleteResponse as GenericDeleteResponse, RecordDoesNotExist},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

#[derive(InputObject)]
#[graphql(name = "DeleteOutboundShipmentUnallocatedLineInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteOutboundShipmentUnallocatedLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentUnallocatedLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteOutboundShipmentUnallocatedLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

impl From<DeleteInput> for ServiceInput {
    fn from(DeleteInput { id }: DeleteInput) -> Self {
        ServiceInput { id }
    }
}

pub fn delete(ctx: &Context<'_>, input: DeleteInput) -> Result<DeleteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .outbound_shipment_line
        .delete_outbound_shipment_unallocated_line(&service_context, input.into())
    {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::LineIsNotUnallocatedLine => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
