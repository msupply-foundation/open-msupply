use repository::{InvoiceLineRow, InvoiceLineRowType, ItemRow, RepositoryError, StorageConnection};

use crate::invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax};

use super::InsertInboundShipmentServiceLine;

pub fn generate(
    connection: &StorageConnection,
    InsertInboundShipmentServiceLine {
        id,
        invoice_id,
        item_id: _,
        name,
        total_before_tax,
        tax,
        note,
    }: InsertInboundShipmentServiceLine,
    item: ItemRow,
    currency_id: &str,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, RepositoryError> {
    Ok(InvoiceLineRow {
        id,
        invoice_id,
        total_before_tax,
        total_after_tax: calculate_total_after_tax(total_before_tax, tax),
        tax,
        note,
        item_code: item.code,
        item_link_id: item.id,
        item_name: name.unwrap_or(item.name),
        r#type: InvoiceLineRowType::Service,
        foreign_currency_price_before_tax: calculate_foreign_currency_total(
            connection,
            total_before_tax,
            currency_id,
            currency_rate,
        )?,
        // Default
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        pack_size: 0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        number_of_packs: 0.0,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
    })
}
