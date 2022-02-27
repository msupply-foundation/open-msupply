use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::{DeleteResponse as GenericDeleteResponse, InvoiceLineConnector};
use service::invoice::inbound_shipment::{
    DeleteInboundShipment as ServiceInput, DeleteInboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeleteInboundShipmentInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInboundShipmentResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.invoice_service.delete_inbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    ) {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

impl DeleteInput {
    fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceLinesExists(lines) => {
            return Ok(DeleteErrorInterface::CannotDeleteInvoiceWithLines(
                CannotDeleteInvoiceWithLines(InvoiceLineConnector::from_vec(lines)),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
