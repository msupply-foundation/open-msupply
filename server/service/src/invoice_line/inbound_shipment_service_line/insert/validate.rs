use repository::{
    InvoiceRow, InvoiceRowType, ItemFilter, ItemRepository, ItemRow, ItemRowType, RepositoryError,
    SimpleStringFilter, StorageConnection,
};
use util::constants::DEFAULT_SERVICE_ITEM_CODE;

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::validate::{check_item_exists, check_line_does_not_exist},
};

use super::{InsertInboundShipmentServiceLine, InsertInboundShipmentServiceLineError};

type OutError = InsertInboundShipmentServiceLineError;

pub fn validate(
    input: &InsertInboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), OutError> {
    if !check_line_does_not_exist(connection, &input.id)? {
        return Err(OutError::LineAlreadyExists);
    }

    let item = match &input.item_id {
        None => {
            get_default_service_item(connection)?.ok_or(OutError::CannotFindDefaultServiceItem)?
        }
        Some(item_id) => {
            let item = check_item_exists(connection, item_id)?.ok_or(OutError::ItemNotFound)?;
            if item.r#type != ItemRowType::Service {
                return Err(OutError::NotAServiceItem);
            }
            item
        }
    };

    let invoice = check_invoice_exists(&input.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(OutError::NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(OutError::NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(OutError::CannotEditInvoice);
    }

    Ok((item, invoice))
}

fn get_default_service_item(
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, RepositoryError> {
    let item_row = ItemRepository::new(connection)
        .query_one(
            None,
            ItemFilter::new().code(SimpleStringFilter::equal_to(DEFAULT_SERVICE_ITEM_CODE)),
        )?
        .map(|item| item.item_row);

    Ok(item_row)
}
