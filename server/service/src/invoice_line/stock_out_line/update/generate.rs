use repository::{InvoiceLineRow, InvoiceRow, InvoiceStatus, ItemRow, StockLine, StockLineRow};

use crate::{
    invoice::common::calculate_total_after_tax,
    pricing::{calculate_sell_price::calculate_sell_price, item_price::ItemPrice},
};

use super::{BatchPair, UpdateStockOutLine, UpdateStockOutLineError};

pub fn generate(
    input: UpdateStockOutLine,
    existing_line: InvoiceLineRow,
    item_row: ItemRow,
    batch_pair: BatchPair,
    invoice: InvoiceRow,
    pricing: ItemPrice,
) -> Result<(InvoiceLineRow, BatchPair), UpdateStockOutLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceStatus::Picked;

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
        batch_pair.main_batch.stock_line_row.clone(),
        pricing,
    );

    Ok((new_line, batch_pair))
}

fn generate_batch_update(
    input: &UpdateStockOutLine,
    existing_line: &InvoiceLineRow,
    batch_pair: &BatchPair,
    adjust_total_number_of_packs: bool,
) -> StockLine {
    let mut update_batch = batch_pair.main_batch.clone();

    let reduction = batch_pair.get_main_batch_reduction(input, existing_line);

    update_batch.stock_line_row.available_number_of_packs -= reduction;
    if adjust_total_number_of_packs {
        update_batch.stock_line_row.total_number_of_packs -= reduction;
    }

    update_batch
}
fn generate_previous_batch_update(
    existing_line: &InvoiceLineRow,
    previous_batch_option: Option<StockLine>,
    adjust_total_number_of_packs: bool,
) -> Option<StockLine> {
    // If previous batch is present, this means batch was changes thus:
    // - release stock of the batch
    previous_batch_option.map(|mut previous_batch| {
        let addition = existing_line.number_of_packs;
        previous_batch.stock_line_row.available_number_of_packs += addition;
        if adjust_total_number_of_packs {
            previous_batch.stock_line_row.total_number_of_packs += addition;
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
        tax_percentage,
        r#type,
        foreign_currency_price_before_tax,
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
        sell_price_per_pack: line_sell_price_per_pack,
        cost_price_per_pack: line_cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        location_id,
        ..
    }: StockLineRow,
    default_pricing: ItemPrice,
) -> InvoiceLineRow {
    let cost_price_per_pack = line_cost_price_per_pack; // For now, we just get the cost price from the stock line

    let sell_price_per_pack =
        calculate_sell_price(line_sell_price_per_pack, pack_size, default_pricing);

    let mut update_line = InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
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
        tax_percentage,
        r#type,
        note: input.note,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax,
    };

    if let Some(number_of_packs) = input.number_of_packs {
        update_line.number_of_packs = number_of_packs;
    }

    update_line.total_before_tax = if let Some(total_before_tax) = input.total_before_tax {
        total_before_tax
    } else if let Some(number_of_packs) = input.number_of_packs {
        update_line.sell_price_per_pack * number_of_packs
    } else if input.stock_line_id.is_some() {
        sell_price_per_pack * number_of_packs
    } else {
        update_line.total_before_tax
    };

    if let Some(tax) = input.tax {
        update_line.tax_percentage = tax.percentage;
    }

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax_percentage);

    update_line
}
