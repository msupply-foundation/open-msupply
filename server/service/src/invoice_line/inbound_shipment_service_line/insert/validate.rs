use repository::{
    InvoiceRow, InvoiceRowType, ItemFilter, ItemRepository, ItemRow, ItemRowType, RepositoryError,
    SimpleStringFilter, StorageConnection,
};
use util::constants::DEFAULT_SERVICE_ITEM_CODE;

use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
        InvoiceDoesNotExist, InvoiceIsNotEditable, NotThisStoreInvoice, WrongInvoiceRowType,
    },
    invoice_line::validate::{
        check_item, check_line_does_not_exists, ItemNotFound, LineAlreadyExists,
    },
};

use super::{InsertInboundShipmentServiceLine, InsertInboundShipmentServiceLineError};

type OutError = InsertInboundShipmentServiceLineError;

pub fn validate(
    input: &InsertInboundShipmentServiceLine,
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

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    check_store(&invoice, store_id)?;
    check_invoice_type(&invoice, InvoiceRowType::InboundShipment)?;
    check_invoice_is_editable(&invoice)?;

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

impl From<InvoiceDoesNotExist> for OutError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        OutError::InvoiceDoesNotExist
    }
}

impl From<WrongInvoiceRowType> for OutError {
    fn from(_: WrongInvoiceRowType) -> Self {
        OutError::NotAnInboundShipment
    }
}

impl From<InvoiceIsNotEditable> for OutError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        OutError::CannotEditInvoice
    }
}

impl From<NotThisStoreInvoice> for OutError {
    fn from(_: NotThisStoreInvoice) -> Self {
        OutError::NotThisStoreInvoice
    }
}
