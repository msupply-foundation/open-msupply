use super::{BatchIsReserved, InvoiceWasCreatedAfterStore};
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
    ZeroInboundShipmentLineQuantities as ServiceInput,
    ZeroInboundShipmentLineQuantitiesError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "ZeroInboundShipmentLineQuantitiesInput")]
pub struct ZeroInboundShipmentLineQuantitiesInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "ZeroInboundShipmentLineQuantitiesError")]
pub struct ZeroInboundShipmentLineQuantitiesError {
    pub error: ZeroInboundShipmentLineQuantitiesErrorInterface,
}

#[derive(Union)]
#[graphql(name = "ZeroInboundShipmentLineQuantitiesResponse")]
pub enum ZeroInboundShipmentLineQuantitiesResponse {
    Error(ZeroInboundShipmentLineQuantitiesError),
    Response(InvoiceLineNode),
}

pub fn zero_inbound_shipment_line_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: ZeroInboundShipmentLineQuantitiesInput,
) -> Result<ZeroInboundShipmentLineQuantitiesResponse> {
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
#[graphql(name = "ZeroInboundShipmentLineQuantitiesErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum ZeroInboundShipmentLineQuantitiesErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    BatchIsReserved(BatchIsReserved),
    InvoiceWasCreatedAfterStore(InvoiceWasCreatedAfterStore),
}

impl ZeroInboundShipmentLineQuantitiesInput {
    pub fn to_domain(self) -> ServiceInput {
        let ZeroInboundShipmentLineQuantitiesInput { id } = self;
        ServiceInput { id }
    }
}

pub fn map_response(
    from: Result<InvoiceLine, ServiceError>,
) -> Result<ZeroInboundShipmentLineQuantitiesResponse> {
    let result = match from {
        Ok(invoice_line) => ZeroInboundShipmentLineQuantitiesResponse::Response(
            InvoiceLineNode::from_domain(invoice_line),
        ),
        Err(error) => ZeroInboundShipmentLineQuantitiesResponse::Error(
            ZeroInboundShipmentLineQuantitiesError {
                error: map_error(error)?,
            },
        ),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<ZeroInboundShipmentLineQuantitiesErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(
                ZeroInboundShipmentLineQuantitiesErrorInterface::RecordNotFound(RecordNotFound {}),
            )
        }
        ServiceError::CannotEditFinalised => {
            return Ok(
                ZeroInboundShipmentLineQuantitiesErrorInterface::CannotEditInvoice(
                    CannotEditInvoice {},
                ),
            )
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(
                ZeroInboundShipmentLineQuantitiesErrorInterface::ForeignKeyError(ForeignKeyError(
                    ForeignKey::InvoiceId,
                )),
            )
        }
        ServiceError::BatchIsReserved => {
            return Ok(
                ZeroInboundShipmentLineQuantitiesErrorInterface::BatchIsReserved(
                    BatchIsReserved {},
                ),
            )
        }
        ServiceError::InvoiceWasCreatedAfterStore => {
            return Ok(
                ZeroInboundShipmentLineQuantitiesErrorInterface::InvoiceWasCreatedAfterStore(
                    InvoiceWasCreatedAfterStore {},
                ),
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
