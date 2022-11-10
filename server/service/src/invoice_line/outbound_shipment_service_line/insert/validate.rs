use repository::{
    InvoiceRow, InvoiceRowType, ItemFilter, ItemRepository, ItemRow, ItemRowType, RepositoryError,
    SimpleStringFilter, StorageConnection,
};
use util::constants::DEFAULT_SERVICE_ITEM_CODE;

use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::validate::{
        check_item, check_line_does_not_exists, ItemNotFound, LineAlreadyExists,
    },
};

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

type OutError = InsertOutboundShipmentServiceLineError;

pub fn validate(
    input: &InsertOutboundShipmentServiceLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), OutError> {
    check_line_does_not_exists(&input.id, connection)?;

    let item = match &input.item_id {
        None => {
            get_default_service_item(connection)?.ok_or(OutError::CannotFindDefaultServiceItem)?
        }
        Some(item_id) => {
            let item = check_item(item_id, connection)?;
            if item.r#type != ItemRowType::Service {
                return Err(OutError::NotAServiceItem);
            }
            item
        }
    };

    let invoice = check_invoice_exists_option(&input.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(OutError::NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
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
        .query_one(ItemFilter::new().code(SimpleStringFilter::equal_to(DEFAULT_SERVICE_ITEM_CODE)))?
        .map(|item| item.item_row);

    Ok(item_row)
}

impl From<LineAlreadyExists> for OutError {
    fn from(_: LineAlreadyExists) -> Self {
        OutError::LineAlreadyExists
    }
}

impl From<ItemNotFound> for OutError {
    fn from(_: ItemNotFound) -> Self {
        OutError::ItemNotFound
    }
}
