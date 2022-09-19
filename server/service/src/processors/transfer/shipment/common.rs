use repository::Invoice;
use repository::{InvoiceLineRow, InvoiceLineRowType, RepositoryError, StorageConnection};
use util::uuid::uuid;

use crate::invoice::common::get_lines_for_invoice;

pub(crate) fn generate_inbound_shipment_lines(
    connection: &StorageConnection,
    inbound_shipment_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let outbound_lines = get_lines_for_invoice(connection, &source_invoice.invoice_row.id)?;

    let inbound_lines = outbound_lines
        .into_iter()
        .map(|l| l.invoice_line_row)
        .map(
            |InvoiceLineRow {
                 id: _,
                 invoice_id: _,
                 item_id,
                 item_name,
                 item_code,
                 stock_line_id: _,
                 location_id: _,
                 batch,
                 expiry_date,
                 pack_size,
                 cost_price_per_pack: _,
                 sell_price_per_pack,
                 number_of_packs,
                 note,
                 r#type,
                 total_after_tax: _,
                 total_before_tax: _,
                 tax: _,
             }| {
                let cost_price_per_pack = sell_price_per_pack;
                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: inbound_shipment_id.to_string(),
                    item_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    // TODO clarify this
                    total_before_tax: cost_price_per_pack * number_of_packs as f64,
                    total_after_tax: cost_price_per_pack * number_of_packs as f64,
                    cost_price_per_pack,
                    r#type: match r#type {
                        InvoiceLineRowType::Service => InvoiceLineRowType::Service,
                        _ => InvoiceLineRowType::StockIn,
                    },
                    number_of_packs,
                    note,
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    sell_price_per_pack: 0.0,
                    tax: Some(0.0),
                }
            },
        )
        .collect();

    Ok(inbound_lines)
}
