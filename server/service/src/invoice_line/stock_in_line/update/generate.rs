use crate::{
    invoice::common::{
        calculate_foreign_currency_total, calculate_total_after_tax,
        generate_invoice_user_id_update,
    },
    invoice_line::{
        stock_in_line::{convert_invoice_line_to_single_pack, generate_batch, StockLineInput},
        StockInType,
    },
    store_preference::get_store_preferences,
};
use chrono::Utc;
use repository::{
    vvm_status::{
        vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        vvm_status_log_row::VVMStatusLogRow,
    },
    EqualFilter, InvoiceLine, InvoiceLineRow, InvoiceRow, InvoiceStatus, ItemRow, RepositoryError,
    StockLineRow, StorageConnection,
};
use util::uuid::uuid;

use super::UpdateStockInLine;

pub struct GenerateResult {
    pub invoice_row_option: Option<InvoiceRow>,
    pub updated_line: InvoiceLineRow,
    pub upsert_batch_option: Option<StockLineRow>,
    pub batch_to_delete_id: Option<String>,
    pub vvm_status_log: Option<VVMStatusLogRow>,
    pub vvm_status_log_to_delete: Option<String>,
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
    let vvm_status_log_to_delete =
        get_vvm_status_log_to_delete(&connection, &current_line, &input)?;

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

    let (upsert_batch_option, vvm_status_log) = if existing_invoice_row.status != InvoiceStatus::New
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
                supplier_link_id: existing_invoice_row.name_link_id.clone(),
                on_hold: false,
                barcode_id: None,
                overwrite_stock_levels: true,
            },
        )?;
        update_line.stock_line_id = Some(new_batch.id.clone());

        let vvm_status_log = if let Some(vvm_status_id) = input.vvm_status_id {
            let mut filter = VVMStatusLogFilter::new();

            if let Some(stock_line_id) = &update_line.stock_line_id {
                filter = filter.stock_line_id(EqualFilter::equal_to(stock_line_id))
            }
            filter = filter.invoice_line_id(EqualFilter::equal_to(&update_line.id));

            let vvm_status_log_line =
                VVMStatusLogRepository::new(connection).query_by_filter(filter)?;

            generate_vvm_status_log(VVMStatusInput {
                store_id: existing_invoice_row.store_id.clone(),
                vvm_status_id,
                stock_line_id: new_batch.id.clone(),
                invoice_line_id: update_line.id.clone(),
                created_by: user_id.to_string(),
                id: vvm_status_log_line.first().map(|log| log.id.clone()),
            })
        } else {
            None
        };
        (Some(new_batch), vvm_status_log)
    } else {
        (None, None)
    };

    Ok(GenerateResult {
        invoice_row_option: generate_invoice_user_id_update(user_id, existing_invoice_row),
        updated_line: update_line,
        upsert_batch_option,
        batch_to_delete_id,
        vvm_status_log,
        vvm_status_log_to_delete,
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

fn get_vvm_status_log_to_delete(
    connection: &StorageConnection,
    current_line: &InvoiceLine,
    input: &UpdateStockInLine,
) -> Result<Option<String>, RepositoryError> {
    // if the input line has no status, find the log of the current line and set the id to delete
    if current_line.invoice_line_row.vvm_status_id.is_some() && input.vvm_status_id.is_none() {
        let mut filter = VVMStatusLogFilter::new();
        if let Some(stock_line_id) = &current_line.invoice_line_row.stock_line_id {
            filter = filter.stock_line_id(EqualFilter::equal_to(stock_line_id))
        }
        filter = filter.invoice_line_id(EqualFilter::equal_to(&current_line.invoice_line_row.id));

        let vvm_status_log_line = VVMStatusLogRepository::new(connection)
            .query_by_filter(filter)?
            .first()
            .map(|log| log.id.clone());

        Ok(vvm_status_log_line)
    } else {
        Ok(None)
    }
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
        id: _,
        item_id: _,
        total_before_tax,
        tax_percentage,
        r#type: _,
        item_variant_id,
        vvm_status_id,
    }: UpdateStockInLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, RepositoryError> {
    let mut update_line = current_line;

    update_line.pack_size = pack_size.unwrap_or(update_line.pack_size);
    update_line.batch = batch.or(update_line.batch);
    update_line.note = note.or(update_line.note);
    update_line.location_id = location.map(|l| l.value).unwrap_or(update_line.location_id);
    update_line.expiry_date = expiry_date.or(update_line.expiry_date);
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
    update_line.vvm_status_id = Some(vvm_status_id).unwrap_or(update_line.vvm_status_id);

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

    Ok(update_line)
}
struct VVMStatusInput {
    id: Option<String>,
    store_id: String,
    vvm_status_id: String,
    stock_line_id: String,
    invoice_line_id: String,
    created_by: String,
}

fn generate_vvm_status_log(
    VVMStatusInput {
        id,
        store_id,
        vvm_status_id,
        stock_line_id,
        invoice_line_id,
        created_by,
    }: VVMStatusInput,
) -> Option<VVMStatusLogRow> {
    let log_status = VVMStatusLogRow {
        id: id.unwrap_or(uuid()),
        status_id: vvm_status_id,
        created_datetime: Utc::now().naive_utc(),
        stock_line_id,
        comment: None,
        created_by,
        invoice_line_id: Some(invoice_line_id),
        store_id,
    };
    return Some(log_status);
}
