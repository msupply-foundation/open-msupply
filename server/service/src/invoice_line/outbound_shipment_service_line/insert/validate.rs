use repository::{
    InvoiceRow, InvoiceType, ItemFilter, ItemRepository, ItemRow, ItemType, RepositoryError,
    StorageConnection, StringFilter,
};
use util::constants::DEFAULT_SERVICE_ITEM_CODE;

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::validate::{check_item_exists, check_line_exists},
};

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

type OutError = InsertOutboundShipmentServiceLineError;

pub fn validate(
    input: &InsertOutboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), OutError> {
    if let Some(_) = check_line_exists(connection, &input.id)? {
        return Err(OutError::LineAlreadyExists);
    }

    let item = match &input.item_id {
        None => {
            get_default_service_item(connection)?.ok_or(OutError::CannotFindDefaultServiceItem)?
        }
        Some(item_id) => {
            let item = check_item_exists(connection, item_id)?.ok_or(OutError::ItemNotFound)?;
            if item.r#type != ItemType::Service {
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
    if !check_invoice_type(&invoice, InvoiceType::OutboundShipment) {
        return Err(OutError::NotAnOutboundShipment);
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
            ItemFilter::new()
                .code(StringFilter::equal_to(DEFAULT_SERVICE_ITEM_CODE))
                .is_active(true),
        )?
        .map(|item| item.item_row);

    Ok(item_row)
}
