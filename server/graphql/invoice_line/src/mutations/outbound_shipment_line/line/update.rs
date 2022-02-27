use async_graphql::*;

use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    simple_generic_errors::{
        CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NodeError,
        NotAnOutboundShipment, Range, RangeError, RangeField, RecordNotFound,
    },
    ContextExt,
};
use graphql_types::types::{InvoiceLineNode, InvoiceLineResponse};
use repository::StorageConnectionManager;
use service::invoice_line::{
    outbound_shipment_line::{
        UpdateOutboundShipmentLine as ServiceInput, UpdateOutboundShipmentLineError as ServiceError,
    },
    ShipmentTaxUpdate,
};

use crate::mutations::outbound_shipment_line::TaxUpdate;

use super::{
    ItemDoesNotMatchStockLine, LineDoesNotReferenceStockLine, LocationIsOnHold, LocationNotFound,
    NotEnoughStockForReduction, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore, StockLineIsOnHold,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentLineInput")]
pub struct UpdateInput {
    pub id: String,
    invoice_id: String,
    item_id: Option<String>,
    stock_line_id: Option<String>,
    number_of_packs: Option<u32>,
    total_before_tax: Option<f64>,
    total_after_tax: Option<f64>,
    tax: Option<TaxUpdate>,
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .update_outbound_shipment_line(&service_context, store_id, input.to_domain())
    {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}
#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    StockLineIsOnHold(StockLineIsOnHold),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
}

impl UpdateInput {
    fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax: tax.map(|tax| ShipmentTaxUpdate {
                percentage: tax.percentage,
            }),
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
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
        ServiceError::StockLineNotFound => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::StockLineId,
            )))
        }
        ServiceError::LocationIsOnHold => {
            return Ok(UpdateErrorInterface::LocationIsOnHold(LocationIsOnHold {}))
        }
        ServiceError::LocationNotFound => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::LocationId,
            )))
        }
        ServiceError::StockLineAlreadyExistsInInvoice(line_id) => {
            return Ok(UpdateErrorInterface::StockLineAlreadyExistsInInvoice(
                StockLineAlreadyExistsInInvoice(line_id),
            ))
        }
        ServiceError::BatchIsOnHold => {
            return Ok(UpdateErrorInterface::StockLineIsOnHold(
                StockLineIsOnHold {},
            ))
        }
        ServiceError::LineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::ReductionBelowZero {
            stock_line_id,
            line_id,
        } => {
            return Ok(UpdateErrorInterface::NotEnoughStockForReduction(
                NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: Some(line_id),
                },
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowOne => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotMatchStockLine => BadUserInput(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::LineDoesNotReferenceStockLine => BadUserInput(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
