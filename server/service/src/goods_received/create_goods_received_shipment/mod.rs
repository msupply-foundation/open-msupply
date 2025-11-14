use repository::{ActivityLogType, Invoice, RepositoryError, TransactionError};

use crate::{
    activity_log::activity_log_entry,
    invoice::inbound_shipment::{insert_inbound_shipment, InsertInboundShipmentError},
    invoice_line::stock_in_line::{insert_stock_in_line, InsertStockInLineError},
    service_provider::ServiceContext,
};

mod generate;
mod test;
mod validate;

use generate::*;
use validate::*;

#[derive(Debug, PartialEq)]
pub struct CreateGoodsReceivedShipment {
    pub goods_received_id: String,
}

#[derive(Debug, PartialEq)]

pub enum CreateGoodsReceivedShipmentError {
    DatabaseError(RepositoryError),
    GoodsReceivedDoesNotExist,
    PurchaseOrderDoesNotExist,
    GoodsReceivedEmpty,
    NoAuthorisedLines,
    PurchaseOrderLinesNotFound(Vec<String>),
    NotThisStoreGoodsReceived,
    NotThisStorePurchaseOrder,
    GoodsReceivedNotFinalised,
    PurchaseOrderNotFinalised,
    InboundShipmentError(InsertInboundShipmentError),
    StockInLineError(InsertStockInLineError),
}

type OutError = CreateGoodsReceivedShipmentError;

pub fn create_goods_received_shipment(
    ctx: &ServiceContext,
    input: CreateGoodsReceivedShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (supplier_name_link, goods_received, line_map) =
                validate(connection, &ctx.store_id, &input)?;

            let (invoice, invoice_lines) =
                generate(connection, supplier_name_link, goods_received, line_map)?;

            let result = insert_inbound_shipment(ctx, invoice.clone())
                .map_err(|error| OutError::InboundShipmentError(error))?;

            for line in invoice_lines {
                insert_stock_in_line(ctx, line)
                    .map_err(|error| OutError::StockInLineError(error))?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(invoice.id.to_string()),
                None,
                None,
            )?;

            Ok(result)
        })
        .map_err(|error: TransactionError<OutError>| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for CreateGoodsReceivedShipmentError {
    fn from(error: RepositoryError) -> Self {
        CreateGoodsReceivedShipmentError::DatabaseError(error)
    }
}
