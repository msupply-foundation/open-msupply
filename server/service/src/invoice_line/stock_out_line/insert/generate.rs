use repository::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, ItemRow, RepositoryError,
    StockLine, StockLineRow, StorageConnection,
};

use crate::{
    invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax},
    invoice_line::StockOutType,
};

use super::{InsertStockOutLine, InsertStockOutLineError};

pub fn generate(
    connection: &StorageConnection,
    input: InsertStockOutLine,
    item_row: ItemRow,
    batch: StockLine,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, StockLineRow), InsertStockOutLineError> {
    let adjust_total_number_of_packs =
        should_adjust_total_number_of_packs(invoice.status.clone(), &input.r#type);

    let update_batch = generate_batch_update(
        input.clone(),
        batch.stock_line_row.clone(),
        adjust_total_number_of_packs,
    );
    let new_line = generate_line(connection, input, item_row, update_batch.clone(), invoice)?;

    Ok((new_line, update_batch))
}

fn generate_batch_update(
    InsertStockOutLine {
        location_id,
        batch: input_batch_name,
        pack_size,
        expiry_date,
        cost_price_per_pack,
        sell_price_per_pack,
        number_of_packs,
        note: _,
        id: _,
        r#type: _,
        invoice_id: _,
        stock_line_id: _,
        total_before_tax: _,
        tax_percentage: _,
    }: InsertStockOutLine,
    batch: StockLineRow,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let available_reduction = number_of_packs;
    let total_reduction = if adjust_total_number_of_packs {
        number_of_packs
    } else {
        0.0
    };

    let updated_batch = StockLineRow {
        available_number_of_packs: batch.available_number_of_packs - available_reduction,
        total_number_of_packs: batch.total_number_of_packs - total_reduction,
        location_id: location_id.or(batch.location_id),
        batch: input_batch_name.or(batch.batch),
        expiry_date: expiry_date.or(batch.expiry_date),
        pack_size: pack_size.unwrap_or(batch.pack_size),
        cost_price_per_pack: cost_price_per_pack.unwrap_or(batch.cost_price_per_pack),
        sell_price_per_pack: sell_price_per_pack.unwrap_or(batch.sell_price_per_pack),
        ..batch
    };

    updated_batch
}

fn generate_line(
    connection: &StorageConnection,
    InsertStockOutLine {
        id,
        r#type: _,
        invoice_id,
        stock_line_id,
        number_of_packs,
        total_before_tax,
        note,
        tax_percentage: _,
        location_id: _,
        batch: _,
        pack_size: _,
        expiry_date: _,
        cost_price_per_pack: _,
        sell_price_per_pack: _,
    }: InsertStockOutLine,
    ItemRow {
        id: item_id,
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
        note: _,
        ..
    }: StockLineRow,
    InvoiceRow {
        tax_percentage,
        currency_id,
        currency_rate,
        ..
    }: InvoiceRow,
) -> Result<InvoiceLineRow, RepositoryError> {
    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax_percentage);
    let foreign_currency_price_before_tax = calculate_foreign_currency_total(
        connection,
        total_before_tax,
        currency_id,
        &currency_rate,
    )?;

    Ok(InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineType::StockOut,
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax_percentage,
        note,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax,
    })
}

fn should_adjust_total_number_of_packs(status: InvoiceStatus, r#type: &StockOutType) -> bool {
    match r#type {
        StockOutType::InventoryReduction => true,
        _ => status == InvoiceStatus::Picked,
    }
}
