use async_graphql::*;

use graphql_core::simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::InvoiceLineNode;

use service::invoice_line::outbound_shipment_line::{
    InsertOutboundShipmentLine as ServiceInput, InsertOutboundShipmentLineError as ServiceError,
};

use super::{
    LocationIsOnHold, LocationNotFound, NotEnoughStockForReduction,
    StockLineAlreadyExistsInInvoice, StockLineIsOnHold,
};

#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .insert_outbound_shipment_line(&service_context, store_id, input.to_domain())
    {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    StockLineIsOnHold(StockLineIsOnHold),
}

impl InsertInput {
    fn to_domain(self) -> ServiceInput {
        let InsertInput {
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
            tax,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::StockLineNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::StockLineId,
            )))
        }
        ServiceError::LocationIsOnHold => {
            return Ok(InsertErrorInterface::LocationIsOnHold(LocationIsOnHold {}))
        }
        ServiceError::LocationNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::LocationId,
            )))
        }
        ServiceError::StockLineAlreadyExistsInInvoice(line_id) => {
            return Ok(InsertErrorInterface::StockLineAlreadyExistsInInvoice(
                StockLineAlreadyExistsInInvoice(line_id),
            ))
        }
        ServiceError::BatchIsOnHold => {
            return Ok(InsertErrorInterface::StockLineIsOnHold(
                StockLineIsOnHold {},
            ))
        }
        ServiceError::ReductionBelowZero { stock_line_id } => {
            return Ok(InsertErrorInterface::NotEnoughStockForReduction(
                NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: None,
                },
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowOne => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotMatchStockLine => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
