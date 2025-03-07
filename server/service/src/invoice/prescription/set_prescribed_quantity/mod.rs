use repository::{
    InvoiceLine, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceStatus,
    InvoiceType, ItemRow, ItemType, RepositoryError, StorageConnection,
};

use crate::{
    invoice::{check_invoice_exists, check_store},
    invoice_line::{query::get_invoice_line, validate::check_item_exists},
    service_provider::ServiceContext,
};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct SetPrescribedQuantity {
    pub invoice_id: String,
    pub item_id: String,
    pub prescribed_quantity: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SetPrescribedQuantityError {
    ItemNotFound, // check if valid item id
    InvoiceDoesNotExist,
    NotAStockItem,
    NotAPrescription,
    NotThisStoreInvoice,
    NewlyCreatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetPrescribedQuantityError {
    fn from(error: RepositoryError) -> Self {
        SetPrescribedQuantityError::DatabaseError(error)
    }
}

pub fn set_prescribed_quantity(
    ctx: &ServiceContext,
    input: SetPrescribedQuantity,
) -> Result<InvoiceLine, SetPrescribedQuantityError> {
    let line = ctx
        .connection
        .transaction_sync(|connection| {
            let item_row = validate(connection, &ctx.store_id, &input)?;

            // TODO:

            // grab all the lines from invoice line that match the item_id and invoice_id
            // if stock_line exists -> update the existing invoice line
            // if there no line with that item_id -> create unallocated
            // if there's multiple lines check if prescribed_quantity or stock_line exists then delete the unallocated if it does

            let repo = InvoiceLineRowRepository::new(connection);

            let existing_line = repo.find_one_by_id(&input.invoice_id);

            // generateUnallocated
            let new_line = generate(input, item_row)?;
            repo.upsert_one(&new_line)?;

            get_invoice_line(ctx, &new_line.id)
                .map_err(SetPrescribedQuantityError::DatabaseError)?
                .ok_or(SetPrescribedQuantityError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &SetPrescribedQuantity,
) -> Result<ItemRow, SetPrescribedQuantityError> {
    let item_row = check_item_exists(connection, &input.item_id)?
        .ok_or(SetPrescribedQuantityError::ItemNotFound)?;

    if item_row.r#type != ItemType::Stock {
        return Err(SetPrescribedQuantityError::NotAStockItem);
    }

    let invoice_row = check_invoice_exists(&input.invoice_id, connection)?
        .ok_or(SetPrescribedQuantityError::InvoiceDoesNotExist)?;
    if !check_store(&invoice_row, store_id) {
        return Err(SetPrescribedQuantityError::NotThisStoreInvoice);
    }

    if invoice_row.r#type != InvoiceType::Prescription {
        return Err(SetPrescribedQuantityError::NotAPrescription);
    }

    Ok(item_row)
}

fn generate(
    SetPrescribedQuantity {
        prescribed_quantity,
        item_id,
        invoice_id,
    }: SetPrescribedQuantity,
    item: ItemRow,
) -> Result<InvoiceLineRow, SetPrescribedQuantityError> {
    let new_line = InvoiceLineRow {
        id: item.id,
        invoice_id,
        item_name: item.name,
        item_code: item.code,
        item_link_id: item_id,
        r#type: InvoiceLineType::UnallocatedStock,
        prescribed_quantity: Some(prescribed_quantity),

        // Default
        pack_size: 0.0,
        number_of_packs: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        note: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        stock_line_id: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
        item_variant_id: None,
    };

    Ok(new_line)
}
