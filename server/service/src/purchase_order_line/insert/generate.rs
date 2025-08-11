use repository::{NumberRowType, PurchaseOrderLineRow, RepositoryError, StorageConnection};

use crate::number::next_number;

use super::InsertPurchaseOrderLineInput;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    let line_number = next_number(
        connection,
        &NumberRowType::PurchaseOrderLine(input.purchase_order_id.clone()),
        store_id,
    )?;

    Ok(PurchaseOrderLineRow {
        id: input.id,
        store_id: store_id.to_string(),
        purchase_order_id: input.purchase_order_id,
        line_number,
        item_link_id: input.item_id,
        requested_number_of_units: input
            .requested_number_of_units
            .unwrap_or(Default::default()),
        requested_pack_size: input.requested_pack_size.unwrap_or_default(),
        requested_delivery_date: input.requested_delivery_date,
        expected_delivery_date: input.expected_delivery_date,
        ..Default::default()
    })
}
