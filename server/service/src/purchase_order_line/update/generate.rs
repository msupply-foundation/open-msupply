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
        price_per_unit_before_discount,
        price_per_unit_after_discount,
        manufacturer_id,
        note,
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
        price_per_unit_before_discount: price_per_unit_before_discount
            .unwrap_or(purchase_order_line.price_per_unit_before_discount),
        price_per_unit_after_discount: price_per_unit_after_discount
            .unwrap_or(purchase_order_line.price_per_unit_after_discount),
        manufacturer_link_id: manufacturer_id
            .map(|v| v.value)
            .unwrap_or(purchase_order_line.manufacturer_link_id),
        note: note.map(|v| v.value).unwrap_or(purchase_order_line.note),
        ..purchase_order_line
    })
}
