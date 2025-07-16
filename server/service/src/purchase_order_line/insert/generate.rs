use repository::{PurchaseOrderLineRow, RepositoryError, StorageConnection};

// use crate::number::next_number;

use super::InsertPurchaseOrderLineInput;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    // let line_number = next_number(connection, $NumberRowType::PurchaseOrderLine, store_id)?;

    Ok(PurchaseOrderLineRow {
        id: input.id,
        purchase_order_id: input.purchase_order_id,
        line_number: 1, // Placeholder for line number logic
        item_link_id: Some(input.item_id),
        ..Default::default()
    })
}
