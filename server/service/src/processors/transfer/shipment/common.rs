use repository::Invoice;
use repository::{InvoiceLineRow, InvoiceLineRowType, RepositoryError, StorageConnection};
use util::uuid::uuid;

use crate::invoice::common::get_lines_for_invoice;
use crate::store_preference::get_store_preferences;

pub(crate) fn generate_inbound_shipment_lines(
    connection: &StorageConnection,
    inbound_shipment_id: &str,
    inbound_shipment_store_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let outbound_lines = get_lines_for_invoice(connection, &source_invoice.invoice_row.id)?;
    let store_preferences = get_store_preferences(connection, &inbound_shipment_store_id)?;

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
                 mut pack_size,
                 cost_price_per_pack: _,
                 sell_price_per_pack,
                 mut number_of_packs,
                 note,
                 r#type,
                 total_after_tax: _,
                 total_before_tax: _,
                 tax,
                 inventory_adjustment_reason_id: _,
             }| {
                let mut cost_price_per_pack = sell_price_per_pack;

                if store_preferences.pack_to_one {
                    number_of_packs = number_of_packs * pack_size as f64;
                    cost_price_per_pack = cost_price_per_pack / pack_size as f64;
                    pack_size = 1;
                }

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
                    total_after_tax: (cost_price_per_pack * number_of_packs)
                        * (1.0 + tax.unwrap_or(0.0) / 100.0) as f64,
                    cost_price_per_pack,
                    r#type: match r#type {
                        InvoiceLineRowType::Service => InvoiceLineRowType::Service,
                        _ => InvoiceLineRowType::StockIn,
                    },
                    number_of_packs,
                    note,
                    tax,
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    sell_price_per_pack: 0.0,
                    inventory_adjustment_reason_id: None,
                }
            },
        )
        .collect();

    Ok(inbound_lines)
}
