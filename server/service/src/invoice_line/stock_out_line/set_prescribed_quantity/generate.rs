use repository::{InvoiceLineRow, InvoiceLineType, ItemRow};

use super::{SetPrescribedQuantity, SetPrescribedQuantityError};

pub fn generate(
    id: String,
    item: ItemRow,
    SetPrescribedQuantity {
        invoice_id,
        item_id,
        prescribed_quantity,
    }: SetPrescribedQuantity,
) -> Result<InvoiceLineRow, SetPrescribedQuantityError> {
    let invoice_line = InvoiceLineRow {
        id,
        invoice_id,
        item_name: item.name,
        item_code: item.code,
        item_link_id: item_id,
        r#type: InvoiceLineType::UnallocatedStock,
        prescribed_quantity: Some(prescribed_quantity),

        // Default
        pack_size: 0.0,
        number_of_packs: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        note: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        stock_line_id: None,
        foreign_currency_price_before_tax: None,
        item_variant_id: None,
        linked_invoice_id: None,
        donor_link_id: None,
        vvm_status_id: None,
        reason_option_id: None,
        campaign_id: None,
        program_id: None,
        shipped_number_of_packs: None,
        volume_per_pack: 0.0,
        shipped_pack_size: None,
        status: None,
    };

    Ok(invoice_line)
}
