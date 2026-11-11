use crate::{
    backend_plugin::types::transform_item_store_properties::Context,
    invoice::common::generate_invoice_user_id_update,
    invoice_line::stock_in_line::{StockLineInput, generate_batch, should_update_stock},
    pricing::default_sell_price::DefaultSellPrices,
};
use repository::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, ItemRow, RepositoryError, RequisitionLineRow,
    StockLineRow, StorageConnection,
};
use util::uuid::uuid;

pub struct GenerateResult {
    pub invoice: Option<InvoiceRow>,
    pub invoice_line: InvoiceLineRow,
    pub stock_line: Option<StockLineRow>,
}

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
    requisition_row: RequisitionLineRow,
) -> Result<GenerateResult, RepositoryError> {
    // The line is created at a pack size of one, and its stock may be created now,
    // so it starts at the store's default sell price for a pack of one
    let sell_price_per_pack = DefaultSellPrices::load(
        connection,
        Context::NewStock,
        &existing_invoice_row.store_id,
        vec![item_row.id.clone()],
    )?
    .for_pack(&item_row, 1.0)
    .unwrap_or(0.0);
    let mut invoice_line = generate_line(
        requisition_row,
        item_row,
        existing_invoice_row.clone(),
        sell_price_per_pack,
    );

    let stock_line = if should_update_stock(&existing_invoice_row) {
        let batch = generate_batch(
            connection,
            invoice_line.clone(),
            StockLineInput {
                stock_line_id: None,
                store_id: existing_invoice_row.store_id.clone(),
                supplier_id: existing_invoice_row.name_id.clone(),
                on_hold: false,
                overwrite_stock_levels: true,
            },
        )?;
        // If a new stock line has been created, update the stock_line_id on the invoice line
        invoice_line.stock_line_id = Some(batch.id.clone());
        Some(batch)
    } else {
        None
    };

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
        campaign_id,
        ..
    }: InvoiceRow,
    sell_price_per_pack: f64,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id: uuid(),
        invoice_id,
        item_id,
        pack_size: 1.0,
        note,
        r#type: InvoiceLineType::StockIn,
        number_of_packs: requested_quantity,
        item_name,
        item_code,
        tax_percentage,
        // Defaults
        stock_line_id: None,
        prescribed_quantity: None,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        sell_price_per_pack,
        cost_price_per_pack: 0.0,
        batch: None,
        expiry_date: None,
        manufacture_date: None,
        purchase_order_line_id: None,
        item_variant_id: None,
        location_id: None,
        foreign_currency_price_before_tax: None,
        linked_invoice_id: None,
        donor_id: None,
        manufacturer_id: None,
        legacy_goods_received_line_id: None,
        transfer_comment: None,
        barcode: None,
        vvm_status_id: None,
        reason_option_id: None,
        // The shipment's default campaign (issue #996)
        campaign_id,
        program_id: None,
        shipped_number_of_packs: None,
        volume_per_pack: 0.0,
        shipped_pack_size: None,
        status: None,
        received_number_of_packs: None,
        linked_invoice_line_id: None,
    }
}
