use repository::{InvoiceLineRow, InvoiceLineType, ItemRow};

use super::{SetPrescribedQuantity, SetPrescribedQuantityError};

/// The unallocated line a prescribed quantity lives on until a dispenser
/// allocates stock against it: no packs, no stock line, no prices — just the
/// item, the figure and (optionally) the prescriber's directions.
///
/// Two things create one: a dispenser typing a prescribed quantity straight
/// onto a dispensing record, and a prescription request being handed over
/// (`prescription_request::generate::create_dispensation`). They must agree on
/// the shape, so they share this constructor rather than each spelling out
/// every defaulted field.
pub fn unallocated_prescribed_line(
    id: String,
    invoice_id: String,
    item: ItemRow,
    prescribed_quantity: f64,
    note: Option<String>,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id,
        invoice_id,
        item_name: item.name,
        item_code: item.code,
        item_id: item.id,
        r#type: InvoiceLineType::UnallocatedStock,
        prescribed_quantity: Some(prescribed_quantity),
        note,

        // Default
        pack_size: 0.0,
        number_of_packs: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        manufacture_date: None,
        purchase_order_line_id: None,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        stock_line_id: None,
        foreign_currency_price_before_tax: None,
        item_variant_id: None,
        linked_invoice_id: None,
        donor_id: None,
        manufacturer_id: None,
        legacy_goods_received_line_id: None,
        vvm_status_id: None,
        reason_option_id: None,
        campaign_id: None,
        program_id: None,
        shipped_number_of_packs: None,
        volume_per_pack: 0.0,
        shipped_pack_size: None,
        status: None,
        received_number_of_packs: None,
        linked_invoice_line_id: None,
    }
}

pub fn generate(
    id: String,
    item: ItemRow,
    SetPrescribedQuantity {
        invoice_id,
        item_id: _,
        prescribed_quantity,
    }: SetPrescribedQuantity,
) -> Result<InvoiceLineRow, SetPrescribedQuantityError> {
    Ok(unallocated_prescribed_line(
        id,
        invoice_id,
        item,
        prescribed_quantity,
        None,
    ))
}
