use super::InsertPurchaseOrderLineInput;
use crate::number::next_number;
use repository::{NumberRowType, PurchaseOrderLineRow, RepositoryError, StorageConnection};

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
        requested_number_of_units: input.requested_number_of_units.unwrap_or_default(),
        requested_pack_size: input.requested_pack_size.unwrap_or_default(),
        requested_delivery_date: input.requested_delivery_date,
        expected_delivery_date: input.expected_delivery_date,
        price_per_unit_after_discount: input.price_per_unit_after_discount.unwrap_or(0.0),
        price_per_unit_before_discount: input.price_per_unit_before_discount.unwrap_or(0.0),
        manufacturer_link_id: input.manufacturer_id,
        note: input.note,
        // Default
        item_name: "".to_string(),
        adjusted_number_of_units: None,
        received_number_of_units: 0.0,
        stock_on_hand_in_units: 0.0,
        supplier_item_code: None,
        comment: None,
    })
}

pub fn generate_from_csv(
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
        requested_pack_size: input.requested_pack_size.unwrap_or(0.0),
        requested_number_of_units: input.requested_number_of_units.unwrap_or(0.0),
        price_per_unit_after_discount: input.price_per_unit_after_discount.unwrap_or(0.0),
        price_per_unit_before_discount: input.price_per_unit_before_discount.unwrap_or(0.0),
        // Default
        item_name: "".to_string(),
        adjusted_number_of_units: None,
        received_number_of_units: 0.0,
        requested_delivery_date: None,
        expected_delivery_date: None,
        stock_on_hand_in_units: 0.0,
        supplier_item_code: None,
        comment: None,
        manufacturer_link_id: None,
        note: None,
    })
}
