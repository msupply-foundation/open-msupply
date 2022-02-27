use async_graphql::*;
use graphql_core::ContextExt;
use service::invoice_line::outbound_shipment_service_line::DeleteOutboundShipmentServiceLineError as ServiceError;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound,
};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use service::invoice_line::outbound_shipment_line::DeleteOutboundShipmentLine as ServiceInput;

#[derive(InputObject)]
#[graphql(name = "DeleteOutboundShipmentServiceLineInput")]
pub struct DeleteInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentServiceLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteOutboundShipmentServiceLineResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .delete_outbound_shipment_service_line(&service_context, store_id, input.to_domain())
    {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "DeleteOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
}

impl DeleteInput {
    fn to_domain(self) -> ServiceInput {
        let DeleteInput { id, invoice_id } = self;
        ServiceInput { id, invoice_id }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        // Standard Graphql Errors
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
