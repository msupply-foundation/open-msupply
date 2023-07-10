use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType, ItemRow, RepositoryError,
    StockLineRow, StorageConnection,
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
        validate::{
            check_line_belongs_to_invoice, check_line_exists_option, check_number_of_packs,
        },
    },
    WithDBError,
};

use super::{validate::check_item_exists, ShipmentTaxUpdate};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateInvoiceLine {
    pub id: String,
    pub item_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotAPrescription,
    NotThisStoreInvoice,
    NotThisInvoiceLine(String),
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    ItemDoesNotMatchStockLine,
    LocationIsOnHold,
    LocationNotFound,
    LineDoesNotReferenceStockLine,
    BatchIsOnHold,
    UpdatedLineDoesNotExist,
    StockLineAlreadyExistsInInvoice(String),
    ReductionBelowZero {
        stock_line_id: String,
        line_id: String,
    },
}

/// During outbound shipment line / prescription line update, stock line may change thus
/// validation and updates need to apply to both batches
pub struct BatchPair {
    /// Main batch to be updated
    pub main_batch: StockLineRow,
    /// Optional previous batch (if batch was changed)
    pub previous_batch_option: Option<StockLineRow>,
}

impl BatchPair {
    /// Calculate reduction amount to apply to main batch
    pub fn get_main_batch_reduction(
        &self,
        input: &UpdateInvoiceLine,
        existing_line: &InvoiceLineRow,
    ) -> f64 {
        // Previous batch exists, this mean new batch was requested means:
        // - reduction should be number of packs from input (or existing line if number of pack is missing in input)
        if self.previous_batch_option.is_some() {
            input
                .number_of_packs
                .unwrap_or(existing_line.number_of_packs)
        } else {
            // Previous batch does not exists, this mean updating existing batch, thus:
            // - reduction is the difference between input and existing line number of packs
            if let Some(number_of_packs) = &input.number_of_packs {
                *number_of_packs - existing_line.number_of_packs
            } else {
                // No changes in input, no reduction
                0.0
            }
        }
    }
}

impl From<RepositoryError> for UpdateInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInvoiceLineError
where
    ERR: Into<UpdateInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

pub fn validate(
    input: &UpdateInvoiceLine,
    store_id: &str,
    connection: &StorageConnection,
    r#type: InvoiceRowType,
) -> Result<(InvoiceLineRow, ItemRow, BatchPair, InvoiceRow), UpdateInvoiceLineError> {
    use UpdateInvoiceLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let unique_stock = check_unique_stock_line(
        &line.id.clone(),
        &invoice.id,
        input.stock_line_id.clone(),
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
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }
    if !check_number_of_packs(input.number_of_packs.clone()) {
        return Err(NumberOfPacksBelowOne);
    }

    let batch_pair = check_batch_exists_option(&input, &line, connection)?;
    let item = check_item_option(input.item_id.clone(), &line, connection)?;

    if !check_item_matches_batch(&batch_pair.main_batch, &item) {
        return Err(ItemDoesNotMatchStockLine);
    }
    if !check_batch_on_hold(&batch_pair.main_batch) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch_pair.main_batch, connection).map_err(|e| match e {
        LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
        LocationIsOnHoldError::LocationNotFound => LocationNotFound,
    })?;
    check_reduction_below_zero(&input, &line, &batch_pair)?;

    Ok((line, item, batch_pair, invoice))
}

fn check_reduction_below_zero(
    input: &UpdateInvoiceLine,
    line: &InvoiceLineRow,
    batch_pair: &BatchPair,
) -> Result<(), UpdateInvoiceLineError> {
    // If previous batch is present, this means we are adjust new batch thus:
    // - check full number of pack in invoice
    let reduction = batch_pair.get_main_batch_reduction(input, line);

    if batch_pair.main_batch.available_number_of_packs < reduction {
        Err(UpdateInvoiceLineError::ReductionBelowZero {
            stock_line_id: batch_pair.main_batch.id.clone(),
            line_id: line.id.clone(),
        })
    } else {
        Ok(())
    }
}

fn check_item_option(
    item_id: Option<String>,
    invoice_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<ItemRow, UpdateInvoiceLineError> {
    if let Some(item_id) = item_id {
        Ok(check_item_exists(connection, &item_id)?.ok_or(UpdateInvoiceLineError::ItemNotFound)?)
    } else {
        Ok(check_item_exists(connection, &invoice_line.item_id)?
            .ok_or(UpdateInvoiceLineError::ItemNotFound)?)
    }
}

fn check_batch_exists_option(
    input: &UpdateInvoiceLine,
    existing_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<BatchPair, UpdateInvoiceLineError> {
    use UpdateInvoiceLineError::*;

    let previous_batch = if let Some(batch_id) = &existing_line.stock_line_id {
        // Should always be found due to contraints on database
        check_batch_exists(batch_id, connection)?.ok_or(StockLineNotFound)?
    } else {
        // This should never happen, but still need to cover
        return Err(LineDoesNotReferenceStockLine);
    };

    let result = match &input.stock_line_id {
        Some(batch_id) if batch_id != &previous_batch.id => BatchPair {
            // stock_line changed
            main_batch: check_batch_exists(batch_id, connection)?.ok_or(StockLineNotFound)?,
            previous_batch_option: Some(previous_batch),
        },
        _ => {
            // stock_line_id not changed
            BatchPair {
                main_batch: previous_batch,
                previous_batch_option: None,
            }
        }
    };

    Ok(result)
}

pub fn generate(
    input: UpdateInvoiceLine,
    existing_line: InvoiceLineRow,
    item_row: ItemRow,
    batch_pair: BatchPair,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, BatchPair), UpdateInvoiceLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceRowStatus::Picked;

    let batch_pair = BatchPair {
        main_batch: generate_batch_update(
            &input,
            &existing_line,
            &batch_pair,
            adjust_total_number_of_packs,
        ),
        previous_batch_option: generate_previous_batch_update(
            &existing_line,
            batch_pair.previous_batch_option,
            adjust_total_number_of_packs,
        ),
    };

    let new_line = generate_line(
        input,
        existing_line,
        item_row,
        batch_pair.main_batch.clone(),
    );

    Ok((new_line, batch_pair))
}

fn generate_batch_update(
    input: &UpdateInvoiceLine,
    existing_line: &InvoiceLineRow,
    batch_pair: &BatchPair,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let mut update_batch = batch_pair.main_batch.clone();

    let reduction = batch_pair.get_main_batch_reduction(input, existing_line);

    update_batch.available_number_of_packs -= reduction;
    if adjust_total_number_of_packs {
        update_batch.total_number_of_packs -= reduction;
    }

    update_batch
}
fn generate_previous_batch_update(
    existing_line: &InvoiceLineRow,
    previous_batch_option: Option<StockLineRow>,
    adjust_total_number_of_packs: bool,
) -> Option<StockLineRow> {
    // If previous batch is present, this means batch was changes thus:
    // - release stock of the batch
    previous_batch_option.map(|mut previous_batch| {
        let addition = existing_line.number_of_packs;
        previous_batch.available_number_of_packs += addition;
        if adjust_total_number_of_packs {
            previous_batch.total_number_of_packs += addition;
        }
        previous_batch
    })
}

fn generate_line(
    input: UpdateInvoiceLine,
    InvoiceLineRow {
        id,
        invoice_id,
        number_of_packs,
        total_before_tax,
        total_after_tax,
        tax,
        r#type,
        ..
    }: InvoiceLineRow,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        id: stock_line_id,
        sell_price_per_pack,
        cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        location_id,
        note,
        ..
    }: StockLineRow,
) -> InvoiceLineRow {
    let mut update_line = InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax,
        r#type,
        note,
        inventory_adjustment_reason_id: None,
    };

    if let Some(number_of_packs) = input.number_of_packs {
        update_line.number_of_packs = number_of_packs;
    }

    update_line.total_before_tax = if let Some(total_before_tax) = input.total_before_tax {
        total_before_tax
    } else if let Some(number_of_packs) = input.number_of_packs {
        update_line.sell_price_per_pack * number_of_packs as f64
    } else if input.stock_line_id.is_some() || input.item_id.is_some() {
        sell_price_per_pack * number_of_packs as f64
    } else {
        update_line.total_before_tax
    };

    if let Some(tax) = input.tax {
        update_line.tax = tax.percentage;
    }

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax);

    update_line
}
