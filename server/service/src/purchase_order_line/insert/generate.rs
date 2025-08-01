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
        ..Default::default()
    })
}

pub struct GenerateFromCSVInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
}

pub fn generate_from_csv(
    connection: &StorageConnection,
    store_id: &str,
    input: GenerateFromCSVInput,
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
        requested_pack_size: input.requested_pack_size.unwrap_or(0.0),
        requested_number_of_units: input.requested_number_of_units.unwrap_or(0.0),
        ..Default::default()
    })
}
