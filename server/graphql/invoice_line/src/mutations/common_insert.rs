use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::ForeignKey;
use graphql_core::simple_generic_errors::ForeignKeyError;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::invoice_line::common_insert_line::InsertInvoiceLine as ServiceInput;
use service::invoice_line::common_insert_line::InsertInvoiceLineError as ServiceError;

use super::outbound_shipment_line::line::LocationIsOnHold;
use super::outbound_shipment_line::line::LocationNotFound;
use super::outbound_shipment_line::line::NotEnoughStockForReduction;
use super::outbound_shipment_line::line::StockLineAlreadyExistsInInvoice;
use super::outbound_shipment_line::line::StockLineIsOnHold;

#[derive(InputObject)]
#[graphql(name = "InsertInvoiceLineInput")]
pub struct InsertInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub total_before_tax: Option<f64>,
    pub tax: Option<f64>,
    pub note: Option<String>,
}

impl InsertInvoiceLineInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInvoiceLineInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            tax,
            note,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            tax,
            note,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInvoiceLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInvoiceLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn map_response(from: Result<InvoiceLine, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "InsertInvoiceLineErrorInterface")]
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
        ServiceError::NotAPrescription => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowOne => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotMatchStockLine => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
