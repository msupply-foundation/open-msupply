use repository::{PurchaseOrderLineRow, RepositoryError};

use crate::purchase_order_line::update::UpdatePurchaseOrderLineInput;

pub fn generate(
    purchase_order_line: PurchaseOrderLineRow,
    input: &UpdatePurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    let UpdatePurchaseOrderLineInput {
        pack_size,
        item_id,
        requested_quantity,
        requested_delivery_date,
        expected_delivery_date,
        .. // excludes ID, grabbed from the existing line instead
    } = input;

    let item_link_id = item_id.clone().unwrap_or(purchase_order_line.item_link_id);

    Ok(PurchaseOrderLineRow {
        item_link_id,
        pack_size: pack_size.or(purchase_order_line.pack_size),
        requested_quantity: requested_quantity.or(purchase_order_line.requested_quantity),
        requested_delivery_date: requested_delivery_date
            .or(purchase_order_line.requested_delivery_date),
        expected_delivery_date: expected_delivery_date
            .or(purchase_order_line.expected_delivery_date),
        ..purchase_order_line
    })
}
