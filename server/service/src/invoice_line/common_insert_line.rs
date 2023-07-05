use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType, ItemRow,
    RepositoryError, StockLineRow, StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
        common::calculate_total_after_tax,
    },
    invoice_line::{
        outbound_shipment_line::{
            check_batch_exists, check_batch_on_hold, check_item_matches_batch,
            check_location_on_hold, check_unique_stock_line, LocationIsOnHoldError,
        },
        validate::{check_item_exists, check_line_does_not_exist, check_number_of_packs},
    },
    WithDBError,
};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertInvoiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub total_before_tax: Option<f64>,
    pub tax: Option<f64>,
    pub note: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertInvoiceLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotAPrescription,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    LocationIsOnHold,
    LocationNotFound,
    StockLineAlreadyExistsInInvoice(String),
    ItemDoesNotMatchStockLine,
    NewlyCreatedLineDoesNotExist,
    BatchIsOnHold,
    ReductionBelowZero { stock_line_id: String },
}

impl From<RepositoryError> for InsertInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInvoiceLineError
where
    ERR: Into<InsertInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

pub fn validate(
    input: &InsertInvoiceLine,
    store_id: &str,
    connection: &StorageConnection,
    r#type: InvoiceRowType,
) -> Result<(ItemRow, InvoiceRow, StockLineRow), InsertInvoiceLineError> {
    use InsertInvoiceLineError::*;

    if !check_line_does_not_exist(connection, &input.id)? {
        return Err(LineAlreadyExists);
    }
    if !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowOne);
    }

    let batch = check_batch_exists(&input.stock_line_id, connection)?.ok_or(StockLineNotFound)?;
    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemNotFound)?;

    if !check_item_matches_batch(&batch, &item) {
        return Err(ItemDoesNotMatchStockLine);
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let unique_stock = check_unique_stock_line(
        &input.id,
        &invoice.id,
        Some(input.stock_line_id.to_string()),
        connection,
    )?;
    if unique_stock.is_some() {
        return Err(StockLineAlreadyExistsInInvoice(unique_stock.unwrap().id));
    }

    if !check_invoice_type(&invoice, r#type.clone()) {
        if r#type == InvoiceRowType::OutboundShipment {
            return Err(NotAnOutboundShipment);
        } else if r#type == InvoiceRowType::Prescription {
            return Err(NotAPrescription);
        }
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch_on_hold(&batch) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch, connection).map_err(|e| match e {
        LocationIsOnHoldError::LocationNotFound => LocationNotFound,
        LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
    })?;
    check_reduction_below_zero(&input, &batch)?;

    Ok((item, invoice, batch))
}

fn check_reduction_below_zero(
    input: &InsertInvoiceLine,
    batch: &StockLineRow,
) -> Result<(), InsertInvoiceLineError> {
    if batch.available_number_of_packs < input.number_of_packs {
        Err(InsertInvoiceLineError::ReductionBelowZero {
            stock_line_id: batch.id.clone(),
        })
    } else {
        Ok(())
    }
}

pub fn generate(
    input: InsertInvoiceLine,
    item_row: ItemRow,
    batch: StockLineRow,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, StockLineRow), InsertInvoiceLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceRowStatus::Picked;

    let update_batch = generate_batch_update(&input, batch.clone(), adjust_total_number_of_packs);
    let new_line = generate_line(input, item_row, batch, invoice);

    Ok((new_line, update_batch))
}

fn generate_batch_update(
    input: &InsertInvoiceLine,
    batch: StockLineRow,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let mut update_batch = batch;

    let reduction = input.number_of_packs;

    update_batch.available_number_of_packs = update_batch.available_number_of_packs - reduction;
    if adjust_total_number_of_packs {
        update_batch.total_number_of_packs = update_batch.total_number_of_packs - reduction;
    }

    update_batch
}

fn generate_line(
    InsertInvoiceLine {
        id,
        invoice_id,
        item_id,
        stock_line_id,
        number_of_packs,
        total_before_tax,
        tax: _,
        note: _,
    }: InsertInvoiceLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        sell_price_per_pack,
        cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        location_id,
        note,
        ..
    }: StockLineRow,
    InvoiceRow { tax, .. }: InvoiceRow,
) -> InvoiceLineRow {
    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax);

    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax,
        note,
        inventory_adjustment_reason_id: None,
    }
}
