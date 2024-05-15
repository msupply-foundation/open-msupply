use crate::{
    barcode::{self, BarcodeInput},
    invoice::common::{calculate_total_after_tax, generate_invoice_user_id_update},
    invoice_line::stock_in_line::{
        convert_invoice_line_to_single_pack, convert_stock_line_to_single_pack, generate_batch,
        StockInType, StockLineInput,
    },
    store_preference::get_store_preferences,
    u32_to_i32,
};
use repository::{
    BarcodeRow, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, ItemRow,
    RepositoryError, StockLineRow, StorageConnection,
};

use super::InsertStockInLine;

pub struct GenerateResult {
    pub invoice: Option<InvoiceRow>,
    pub invoice_line: InvoiceLineRow,
    pub stock_line: Option<StockLineRow>,
    pub barcode: Option<BarcodeRow>,
}

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: InsertStockInLine,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let store_preferences = get_store_preferences(connection, &existing_invoice_row.store_id)?;

    let new_line = generate_line(input.clone(), item_row, existing_invoice_row.clone());

    let mut new_line = match store_preferences.pack_to_one {
        true => convert_invoice_line_to_single_pack(new_line),
        false => new_line,
    };

    let barcode_option = generate_barcode(&input, connection)?;

    let batch_option = if should_upsert_batch(&input.r#type, &existing_invoice_row) {
        let batch = generate_batch(
            input.stock_line_id,
            new_line.clone(),
            StockLineInput {
                store_id: existing_invoice_row.store_id.clone(),
                supplier_link_id: existing_invoice_row.name_link_id.clone(),
                on_hold: input.stock_on_hold,
                barcode_id: barcode_option.clone().map(|b| b.id.clone()),
            },
        );
        // If a new stock line has been created, update the stock_line_id on the invoice line
        new_line.stock_line_id = Some(batch.id.clone());

        let new_batch = match store_preferences.pack_to_one {
            true => convert_stock_line_to_single_pack(batch),
            false => batch,
        };

        Some(new_batch)
    } else {
        None
    };

    Ok(GenerateResult {
        invoice: generate_invoice_user_id_update(user_id, existing_invoice_row),
        invoice_line: new_line,
        stock_line: batch_option,
        barcode: barcode_option,
    })
}

fn generate_line(
    InsertStockInLine {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        location,
        total_before_tax,
        note,
        stock_line_id,
        barcode: _,
        stock_on_hold: _,
        tax_percentage: _,
        r#type: _,
    }: InsertStockInLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    InvoiceRow { tax_percentage, .. }: InvoiceRow,
) -> InvoiceLineRow {
    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax_percentage);
    InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
        location_id: location.map(|l| l.value).unwrap_or_default(),
        pack_size: u32_to_i32(pack_size),
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineType::StockIn,
        number_of_packs,
        item_name,
        item_code,
        stock_line_id,
        total_before_tax,
        total_after_tax,
        tax_percentage,
        note,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    }
}

fn should_upsert_batch(stock_in_type: &StockInType, existing_invoice_row: &InvoiceRow) -> bool {
    match stock_in_type {
        StockInType::InboundShipment | StockInType::InboundReturn => {
            existing_invoice_row.status != InvoiceStatus::New
        }
        StockInType::InventoryAddition => true,
    }
}

fn generate_barcode(
    input: &InsertStockInLine,
    connection: &StorageConnection,
) -> Result<Option<BarcodeRow>, RepositoryError> {
    let gtin = &input.barcode;

    let barcode = match gtin {
        Some(gtin) => {
            // don't create barcode if gtin is empty
            if gtin == "" {
                return Ok(None);
            }

            let barcode_row = barcode::generate(
                connection,
                BarcodeInput {
                    gtin: gtin.clone(),
                    item_id: input.item_id.clone(),
                    pack_size: Some(u32_to_i32(input.pack_size.clone())),
                },
            )?;

            Some(barcode_row)
        }
        None => None,
    };

    Ok(barcode)
}
