use repository::{InvoiceLineRow, InvoiceLineType, ItemRow, StorageConnection};

use crate::invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax};

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

pub fn generate(
    connection: &StorageConnection,
    InsertOutboundShipmentServiceLine {
        id,
        invoice_id,
        item_id: _,
        name,
        total_before_tax,
        tax_percentage,
        note,
    }: InsertOutboundShipmentServiceLine,
    item: ItemRow,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, InsertOutboundShipmentServiceLineError> {
    Ok(InvoiceLineRow {
        id,
        invoice_id,
        total_before_tax,
        total_after_tax: calculate_total_after_tax(total_before_tax, tax_percentage),
        tax_percentage,
        note,
        item_code: item.code,
        item_link_id: item.id,
        item_name: name.unwrap_or(item.name),
        r#type: InvoiceLineType::Service,
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
        pack_size: 0.0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        number_of_packs: 0.0,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        item_variant_id: None,
    })
}
