use repository::{PurchaseOrderLineRow, RepositoryError};

use crate::purchase_order_line::update::UpdatePurchaseOrderLineInput;

pub fn generate(
    purchase_order_line: PurchaseOrderLineRow,
    UpdatePurchaseOrderLineInput {
        id: _,
        item_id,
        requested_pack_size,
        requested_number_of_units,
        adjusted_number_of_units,
        requested_delivery_date,
        expected_delivery_date,
        price_per_pack_before_discount,
        price_per_pack_after_discount,
        manufacturer_id,
        note,
        unit,
        supplier_item_code,
        comment,
        status,
    }: UpdatePurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    Ok(PurchaseOrderLineRow {
        item_link_id: item_id.clone().unwrap_or(purchase_order_line.item_link_id),
        requested_pack_size: requested_pack_size.unwrap_or(purchase_order_line.requested_pack_size),
        requested_number_of_units: requested_number_of_units
            .unwrap_or(purchase_order_line.requested_number_of_units),
        adjusted_number_of_units: adjusted_number_of_units
            .or(purchase_order_line.adjusted_number_of_units),
        requested_delivery_date: requested_delivery_date
            .or(purchase_order_line.requested_delivery_date),
        expected_delivery_date: expected_delivery_date
            .or(purchase_order_line.expected_delivery_date),
        price_per_pack_before_discount: price_per_pack_before_discount
            .unwrap_or(purchase_order_line.price_per_pack_before_discount),
        price_per_pack_after_discount: price_per_pack_after_discount
            .unwrap_or(purchase_order_line.price_per_pack_after_discount),
        manufacturer_id: manufacturer_id
            .map(|v| v.value)
            .unwrap_or(purchase_order_line.manufacturer_id),
        note: note.map(|v| v.value).unwrap_or(purchase_order_line.note),
        unit: unit.or(purchase_order_line.unit),
        supplier_item_code: supplier_item_code
            .map(|v| v.value)
            .unwrap_or(purchase_order_line.supplier_item_code),
        comment: comment
            .map(|v| v.value)
            .unwrap_or(purchase_order_line.comment),
        status: status.unwrap_or(purchase_order_line.status),
        ..purchase_order_line
    })
}
