use super::{BatchIsReserved};
use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound},
    ContextExt,
};

use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::inbound_shipment_line::{
    ZeroInboundShipmentLineQuantity as ServiceInput,
    ZeroInboundShipmentLineQuantityError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "ZeroInboundShipmentLineQuantityInput")]
pub struct ZeroInboundShipmentLineQuantityInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "ZeroInboundShipmentLineQuantityError")]
pub struct ZeroInboundShipmentLineQuantityError {
    pub error: ZeroInboundShipmentLineQuantityErrorInterface,
}

#[derive(Union)]
#[graphql(name = "ZeroInboundShipmentLineQuantityResponse")]
pub enum ZeroInboundShipmentLineQuantityResponse {
    Error(ZeroInboundShipmentLineQuantityError),
    Response(InvoiceLineNode),
}

pub fn zero_inbound_shipment_line_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: ZeroInboundShipmentLineQuantityInput,
) -> Result<ZeroInboundShipmentLineQuantityResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_line_service
            .zero_inbound_shipment_line_quantity(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(name = "ZeroInboundShipmentLineQuantityErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum ZeroInboundShipmentLineQuantityErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    BatchIsReserved(BatchIsReserved),
}

impl ZeroInboundShipmentLineQuantityInput {
    pub fn to_domain(self) -> ServiceInput {
        let ZeroInboundShipmentLineQuantityInput { id } = self;
        ServiceInput { id }
    }
}

pub fn map_response(
    from: Result<InvoiceLine, ServiceError>,
) -> Result<ZeroInboundShipmentLineQuantityResponse> {
    let result = match from {
        Ok(invoice_line) => ZeroInboundShipmentLineQuantityResponse::Response(
            InvoiceLineNode::from_domain(invoice_line),
        ),
        Err(error) => {
            ZeroInboundShipmentLineQuantityResponse::Error(ZeroInboundShipmentLineQuantityError {
                error: map_error(error)?,
            })
        }
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<ZeroInboundShipmentLineQuantityErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(
                ZeroInboundShipmentLineQuantityErrorInterface::RecordNotFound(RecordNotFound {}),
            )
        }
        ServiceError::CannotEditFinalised => {
            return Ok(
                ZeroInboundShipmentLineQuantityErrorInterface::CannotEditInvoice(
                    CannotEditInvoice {},
                ),
            )
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(
                ZeroInboundShipmentLineQuantityErrorInterface::ForeignKeyError(ForeignKeyError(
                    ForeignKey::InvoiceId,
                )),
            )
        }
        ServiceError::BatchIsReserved => {
            return Ok(
                ZeroInboundShipmentLineQuantityErrorInterface::BatchIsReserved(BatchIsReserved {}),
            )
        }
        // Standard Graphql Errors
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
