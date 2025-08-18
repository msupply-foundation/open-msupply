use repository::{
    ActivityLogType, EqualFilter, Invoice, InvoiceFilter, InvoiceLineRowRepository,
    InvoiceRepository, InvoiceRowRepository, RepositoryError,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

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
    CreatedInvoiceDoesNotExist,
    ProblemGettingOtherParty,
    GoodsReceivedDoesNotExist,
    PurchaseOrderDoesNotExist,
    GoodsReceivedEmpty,
    PurchaseOrderLinesNotFound(Vec<String>),
    NotThisStoreGoodsReceived,
    NotThisStorePurchaseOrder,
    GoodsReceivedNotFinalised,
    PurchaseOrderNotFinalised,
}

type OutError = CreateGoodsReceivedShipmentError;

pub fn create_goods_received_shipment(
    ctx: &ServiceContext,
    input: CreateGoodsReceivedShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            // TODO: Replace the following arguments with actual values as needed
            let (supplier_name_link, goods_received, line_map) =
                validate(connection, &ctx.store_id, &input)?;

            let (invoice_row, invoice_line_rows) = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                supplier_name_link,
                goods_received,
                line_map,
            )?;


            insert_inbound_shipment()

            let invoice_line_repository = InvoiceLineRowRepository::new(connection);
            for row in invoice_line_rows {
                invoice_line_repository.upsert_one(&row)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(invoice_row.id.to_owned()),
                None,
                None,
            )?;

            let mut result = InvoiceRepository::new(connection)
                .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(&invoice_row.id)))?;

            result
                .pop()
                .ok_or(CreateGoodsReceivedShipmentError::CreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for CreateGoodsReceivedShipmentError {
    fn from(error: RepositoryError) -> Self {
        CreateGoodsReceivedShipmentError::DatabaseError(error)
    }
}
