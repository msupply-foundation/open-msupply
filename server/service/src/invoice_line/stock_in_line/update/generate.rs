use crate::{
    invoice::common::{
        calculate_foreign_currency_total, calculate_total_after_tax,
        generate_invoice_user_id_update, generate_vvm_status_log, GenerateVVMStatusLogInput,
    },
    invoice_line::{
        stock_in_line::{
            convert_invoice_line_to_single_pack, generate_batch, get_existing_vvm_status_log_id,
            should_update_stock, StockLineInput,
        },
        StockInType,
    },
    store_preference::get_store_preferences,
};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRow, InvoiceLine, InvoiceLineRow, InvoiceRow,
    ItemRow, RepositoryError, StockLineRow, StorageConnection,
};

use super::UpdateStockInLine;

pub struct GenerateResult {
    pub invoice_row_option: Option<InvoiceRow>,
    pub updated_line: InvoiceLineRow,
    pub upsert_batch_option: Option<StockLineRow>,
    pub batch_to_delete_id: Option<String>,
    pub vvm_status_log_option: Option<VVMStatusLogRow>,
}

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: UpdateStockInLine,
    current_line: InvoiceLine,
    new_item_option: Option<ItemRow>,
    existing_invoice_row: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let store_preferences = get_store_preferences(connection, &existing_invoice_row.store_id)?;

    let batch_to_delete_id = get_batch_to_delete_id(&current_line, &new_item_option);

    let mut update_line = generate_line(
        connection,
        input.clone(),
        current_line.invoice_line_row,
        new_item_option,
        existing_invoice_row.currency_id.clone(),
        &existing_invoice_row.currency_rate,
    )?;

    if StockInType::InventoryAddition != input.r#type && store_preferences.pack_to_one {
        update_line = convert_invoice_line_to_single_pack(update_line);
    }

    let (upsert_batch_option, vvm_status_log_option) = if should_update_stock(&existing_invoice_row)
    {
        // There will be a batch_to_delete_id if the item has changed
        // If item has changed, we want a new stock line, otherwise keep existing
        let stock_line_id = match batch_to_delete_id {
            Some(_) => None, // will generate new stock line
            None => update_line.stock_line_id.clone(),
        };

        let new_batch = generate_batch(
            connection,
            update_line.clone(),
            StockLineInput {
                stock_line_id,
                store_id: existing_invoice_row.store_id.clone(),
                supplier_id: existing_invoice_row.name_id.clone(),
                on_hold: false,
                barcode_id: None,
                overwrite_stock_levels: true,
            },
        )?;
        update_line.stock_line_id = Some(new_batch.id.clone());

        let vvm_status_log_option = if let Some(vvm_status_id) = input.vvm_status_id {
            let existing_log_id =
                get_existing_vvm_status_log_id(connection, &new_batch.id, &update_line.id)?;

            Some(generate_vvm_status_log(GenerateVVMStatusLogInput {
                id: existing_log_id,
                store_id: existing_invoice_row.store_id.clone(),
                created_by: user_id.to_string(),
                vvm_status_id,
                stock_line_id: new_batch.id.clone(),
                invoice_line_id: update_line.id.clone(),
                comment: None,
            }))
        } else {
            None
        };

        (Some(new_batch), vvm_status_log_option)
    } else {
        (None, None)
    };

    Ok(GenerateResult {
        invoice_row_option: generate_invoice_user_id_update(user_id, existing_invoice_row),
        updated_line: update_line,
        upsert_batch_option,
        batch_to_delete_id,
        vvm_status_log_option,
    })
}

fn get_batch_to_delete_id(
    current_line: &InvoiceLine,
    new_item_option: &Option<ItemRow>,
) -> Option<String> {
    if let (Some(new_item), Some(stock_line_id)) = (
        new_item_option,
        &current_line.invoice_line_row.stock_line_id,
    ) {
        if new_item.id != current_line.item_row.id {
            return Some(stock_line_id.clone());
        }
    }
    None
}

fn generate_line(
    connection: &StorageConnection,
    UpdateStockInLine {
        pack_size,
        batch,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        number_of_packs,
        note,
        location,
        total_before_tax,
        tax_percentage,
        item_variant_id,
        vvm_status_id,
        donor_id,
        campaign_id,
        program_id,
        shipped_number_of_packs,
        volume_per_pack,
        shipped_pack_size,
        id: _,
        item_id: _,
        r#type: _,
    }: UpdateStockInLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, RepositoryError> {
    let mut update_line = current_line;

    update_line.pack_size = pack_size.unwrap_or(update_line.pack_size);
    update_line.batch = batch.or(update_line.batch);
    update_line.note = note.map(|n| n.value).unwrap_or(update_line.note);
    update_line.location_id = location.map(|l| l.value).unwrap_or(update_line.location_id);
    update_line.expiry_date = expiry_date
        .map(|expiry_date| expiry_date.value)
        .unwrap_or(update_line.expiry_date);
    update_line.sell_price_per_pack =
        sell_price_per_pack.unwrap_or(update_line.sell_price_per_pack);
    update_line.cost_price_per_pack =
        cost_price_per_pack.unwrap_or(update_line.cost_price_per_pack);
    update_line.number_of_packs = number_of_packs.unwrap_or(update_line.number_of_packs);
    update_line.tax_percentage = tax_percentage
        .map(|tax| tax.percentage)
        .unwrap_or(update_line.tax_percentage);
    update_line.foreign_currency_price_before_tax = calculate_foreign_currency_total(
        connection,
        update_line.total_before_tax,
        currency_id,
        currency_rate,
    )?;
    update_line.item_variant_id = item_variant_id
        .map(|v| v.value)
        .unwrap_or(update_line.item_variant_id);

    update_line.donor_id = donor_id
        .map(|d| d.value)
        .unwrap_or(update_line.donor_id);

    update_line.vvm_status_id = vvm_status_id.or(update_line.vvm_status_id);

    if let Some(item) = new_item_option {
        update_line.item_link_id = item.id;
        update_line.item_code = item.code;
        update_line.item_name = item.name;
    }

    update_line.total_before_tax = if let Some(total_before_tax) = total_before_tax {
        total_before_tax
    } else if number_of_packs.is_some() || cost_price_per_pack.is_some() {
        update_line.cost_price_per_pack * update_line.number_of_packs
    } else {
        update_line.total_before_tax
    };

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax_percentage);

    update_line.campaign_id = campaign_id
        .map(|c| c.value)
        .unwrap_or(update_line.campaign_id);

    update_line.program_id = program_id
        .map(|c| c.value)
        .unwrap_or(update_line.program_id);

    update_line.shipped_number_of_packs =
        shipped_number_of_packs.or(update_line.shipped_number_of_packs);
    update_line.shipped_pack_size = shipped_pack_size.or(update_line.shipped_pack_size);

    update_line.volume_per_pack = volume_per_pack.unwrap_or(update_line.volume_per_pack);

    Ok(update_line)
}
