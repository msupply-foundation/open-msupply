use crate::{
    barcode::{self, BarcodeInput},
    invoice::common::{
        calculate_total_after_tax, generate_invoice_user_id_update, generate_vvm_status_log,
        GenerateVVMStatusLogInput,
    },
    invoice_line::stock_in_line::{
        convert_invoice_line_to_single_pack, generate_batch, should_update_stock, StockInType,
        StockLineInput,
    },
    store_preference::get_store_preferences,
};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRow, BarcodeRow, InvoiceLineRow, InvoiceLineType,
    InvoiceRow, ItemRow, RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection,
};

use super::InsertStockInLine;

pub struct GenerateResult {
    pub invoice: Option<InvoiceRow>,
    pub invoice_line: InvoiceLineRow,
    pub stock_line: Option<StockLineRow>,
    pub barcode: Option<BarcodeRow>,
    pub vvm_status_log: Option<VVMStatusLogRow>,
}

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: InsertStockInLine,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let store_preferences = get_store_preferences(connection, &existing_invoice_row.store_id)?;

    let mut new_line = generate_line(input.clone(), item_row, existing_invoice_row.clone()); // include vvm status here

    // Check if the stock line already exists, if it does we may need to update it rather than replacing it
    let old_stock_line = match &input.stock_line_id {
        Some(stock_line_id) => {
            StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?
        }
        None => None,
    };

    let should_overwrite_stock_levels = match &input.r#type {
        // Even though we're `inserting` here, if a stock line already exists, we want to add to the existing quantity rather than replace it.
        // for inventory adjustments and customer returns
        StockInType::InventoryAddition => false,
        // For customer returns, we only want to overwrite stock levels if the stock line does't already exist
        StockInType::CustomerReturn => old_stock_line.is_none(),
        // For inbound shipments, we always create a new stock line, never update an existing one, so should overwrite stock levels based on the invoice when adding stock
        StockInType::InboundShipment => true,
    };

    if should_overwrite_stock_levels && store_preferences.pack_to_one {
        new_line = convert_invoice_line_to_single_pack(new_line);
    }

    let barcode_option = generate_barcode(&input, connection)?;

    let (batch_option, vvm_status_log) =
        if should_upsert_batch(&input.r#type, &existing_invoice_row) {
            let batch = generate_batch(
                connection,
                new_line.clone(),
                StockLineInput {
                    stock_line_id: input.stock_line_id.clone(),
                    store_id: existing_invoice_row.store_id.clone(),
                    supplier_link_id: existing_invoice_row.name_link_id.clone(),
                    on_hold: input.stock_on_hold,
                    barcode_id: barcode_option.clone().map(|b| b.id.clone()),
                    overwrite_stock_levels: should_overwrite_stock_levels,
                },
            )?;

            // If a new stock line has been created, update the stock_line_id on the invoice line
            new_line.stock_line_id = Some(batch.id.clone());

            let vvm_status_log = if let Some(vvm_status_id) = input.vvm_status_id {
                Some(generate_vvm_status_log(GenerateVVMStatusLogInput {
                    id: None,
                    store_id: existing_invoice_row.store_id.clone(),
                    created_by: user_id.to_string(),
                    vvm_status_id,
                    stock_line_id: batch.id.clone(),
                    invoice_line_id: new_line.id.clone(),
                    comment: None,
                }))
            } else {
                None
            };

            (Some(batch), vvm_status_log)
        } else {
            (None, None)
        };

    Ok(GenerateResult {
        invoice: generate_invoice_user_id_update(user_id, existing_invoice_row),
        invoice_line: new_line,
        stock_line: batch_option,
        barcode: barcode_option,
        vvm_status_log,
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
        item_variant_id,
        vvm_status_id,
        donor_id,
        program_id,
        campaign_id,
        shipped_number_of_packs,
        volume_per_pack,
        shipped_pack_size,
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
    InvoiceRow {
        tax_percentage,
        default_donor_link_id: default_donor_id,
        ..
    }: InvoiceRow,
) -> InvoiceLineRow {
    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax_percentage);
    // default to invoice_row donor_id if none supplied on insert
    let donor_id = donor_id.or(default_donor_id);

    InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
        location_id: location.map(|l| l.value).unwrap_or_default(),
        pack_size,
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
        item_variant_id,
        vvm_status_id,
        donor_link_id: donor_id,
        campaign_id,
        program_id,
        shipped_number_of_packs,
        volume_per_pack: volume_per_pack.unwrap_or(0.0),
        shipped_pack_size,
        foreign_currency_price_before_tax: None,
        linked_invoice_id: None,
        prescribed_quantity: None,
        reason_option_id: None,
        status: None,
    }
}

fn should_upsert_batch(stock_in_type: &StockInType, existing_invoice_row: &InvoiceRow) -> bool {
    match stock_in_type {
        StockInType::InboundShipment | StockInType::CustomerReturn => {
            should_update_stock(existing_invoice_row)
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
            if gtin.is_empty() {
                return Ok(None);
            }

            let barcode_row = barcode::generate(
                connection,
                BarcodeInput {
                    gtin: gtin.clone(),
                    item_id: input.item_id.clone(),
                    pack_size: Some(input.pack_size),
                },
            )?;

            Some(barcode_row)
        }
        None => None,
    };

    Ok(barcode)
}
