use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        inbound_shipment_line::check_batch,
        validate::{check_line_belongs_to_invoice, check_line_exists_option},
    },
};
use chrono::{NaiveDateTime, NaiveTime};
use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowType, RepositoryError, StorageConnection,
    StoreRowRepository,
};

use super::{ZeroInboundShipmentLineQuantities, ZeroInboundShipmentLineQuantitiesError};

pub fn validate(
    input: &ZeroInboundShipmentLineQuantities,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceRow, InvoiceLineRow), ZeroInboundShipmentLineQuantitiesError> {
    use ZeroInboundShipmentLineQuantitiesError::*;

    let line = check_line_exists_option(connection, &input.id)?
        .ok_or(LineDoesNotExist)?
        .invoice_line_row;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch(&line, connection)? {
        return Err(BatchIsReserved);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }
    if !check_invoice_was_before_store(connection, store_id, &invoice)? {
        return Err(InvoiceWasCreatedAfterStore);
    }

    Ok((invoice, line))
}

fn check_invoice_was_before_store(
    connection: &StorageConnection,
    store_id: &str,
    invoice: &InvoiceRow,
) -> Result<bool, RepositoryError> {
    let store = StoreRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .ok_or(RepositoryError::NotFound)?;

    let store_created_datetime = store
        .created_date
        .map(|date| NaiveDateTime::new(date, NaiveTime::from_hms_opt(0, 0, 0).unwrap_or_default()))
        .unwrap_or_default();

    if invoice.created_datetime < store_created_datetime {
        return Ok(true);
    }
    Ok(false)
}
