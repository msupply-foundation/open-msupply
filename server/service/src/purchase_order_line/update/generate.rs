use repository::{PurchaseOrderLineRow, RepositoryError};

use crate::purchase_order_line::update::UpdatePurchaseOrderLineInput;

pub fn generate(
    purchase_order_line: PurchaseOrderLineRow,
    input: &UpdatePurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    let UpdatePurchaseOrderLineInput {
        item_id,
        requested_pack_size,
        requested_number_of_units,
        adjusted_number_of_units,
        requested_delivery_date,
        expected_delivery_date,
        id: _,
    } = input;

    let item_link_id = item_id.clone().unwrap_or(purchase_order_line.item_link_id);

    Ok(PurchaseOrderLineRow {
        item_link_id,
        requested_pack_size: requested_pack_size.unwrap_or(purchase_order_line.requested_pack_size),
        requested_number_of_units: requested_number_of_units
            .unwrap_or(purchase_order_line.requested_number_of_units),
        adjusted_number_of_units: adjusted_number_of_units
            .or(purchase_order_line.adjusted_number_of_units),
        requested_delivery_date: requested_delivery_date
            .or(purchase_order_line.requested_delivery_date),
        expected_delivery_date: expected_delivery_date
            .or(purchase_order_line.expected_delivery_date),
        ..purchase_order_line
    })
}
