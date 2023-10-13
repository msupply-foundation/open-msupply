use repository::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow};

use crate::invoice::common::calculate_total_after_tax;

use super::{BatchPair, UpdateStockOutLine, UpdateStockOutLineError};

pub fn generate(
    input: UpdateStockOutLine,
    existing_line: InvoiceLineRow,
    item_row: ItemRow,
    batch_pair: BatchPair,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, BatchPair), UpdateStockOutLineError> {
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
    input: &UpdateStockOutLine,
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
    input: UpdateStockOutLine,
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
        ..
    }: StockLineRow,
) -> InvoiceLineRow {
    let mut update_line = InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id: location_id.clone(),
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
        note: input.note,
        inventory_adjustment_reason_id: None,
    };

    if location_id == Some("None".to_string()) {
        update_line.location_id = None;
    }

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
