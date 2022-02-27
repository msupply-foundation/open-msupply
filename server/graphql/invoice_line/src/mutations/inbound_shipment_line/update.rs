use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, ForeignKey, ForeignKeyError, NotAnInboundShipment, RecordNotFound,
};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::InvoiceLineNode;

use service::invoice_line::inbound_shipment_line::{
    UpdateInboundShipmentLine as ServiceInput, UpdateInboundShipmentLineError as ServiceError,
};

use super::BatchIsReserved;

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub location_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .update_inbound_shipment_line(&service_context, store_id, input.to_domain())
    {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    BatchIsReserved(BatchIsReserved),
}

impl UpdateInput {
    fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            invoice_id,
            item_id,
            location_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            location_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::LineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::BatchIsReserved => {
            return Ok(UpdateErrorInterface::BatchIsReserved(BatchIsReserved {}))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowOne => BadUserInput(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::PackSizeBelowOne => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotExist => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
