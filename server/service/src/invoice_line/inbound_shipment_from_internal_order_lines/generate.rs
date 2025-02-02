use crate::{
    invoice::common::generate_invoice_user_id_update,
    invoice_line::stock_in_line::{generate_batch, StockLineInput},
};
use repository::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, ItemRow, RepositoryError, RequisitionLineRow,
    StockLineRow, StorageConnection,
};
use util::uuid::uuid;

pub struct GenerateResult {
    pub invoice: Option<InvoiceRow>,
    pub invoice_line: InvoiceLineRow,
    pub stock_line: StockLineRow,
}

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
    requisition_row: RequisitionLineRow,
) -> Result<GenerateResult, RepositoryError> {
    let mut invoice_line = generate_line(requisition_row, item_row, existing_invoice_row.clone());

    let stock_line = generate_batch(
        connection,
        invoice_line.clone(),
        StockLineInput {
            stock_line_id: None,
            store_id: existing_invoice_row.store_id.clone(),
            supplier_link_id: existing_invoice_row.name_link_id.clone(),
            on_hold: false,
            barcode_id: None,
            overwrite_stock_levels: true,
        },
    )?;
    // If a new stock line has been created, update the stock_line_id on the invoice line
    invoice_line.stock_line_id = Some(stock_line.id.clone());

    Ok(GenerateResult {
        invoice: generate_invoice_user_id_update(user_id, existing_invoice_row),
        invoice_line,
        stock_line,
    })
}

fn generate_line(
    RequisitionLineRow {
        requested_quantity,
        comment: note,
        ..
    }: RequisitionLineRow,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    InvoiceRow {
        id: invoice_id,
        tax_percentage,
        ..
    }: InvoiceRow,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id: uuid(),
        invoice_id,
        item_link_id: item_id,
        pack_size: 1.0,
        note,
        r#type: InvoiceLineType::StockIn,
        number_of_packs: requested_quantity,
        item_name,
        item_code,
        // Deafults
        stock_line_id: None,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        batch: None,
        expiry_date: None,
        item_variant_id: None,
        location_id: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    }
}
