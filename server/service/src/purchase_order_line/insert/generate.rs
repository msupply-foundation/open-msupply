use super::InsertPurchaseOrderLineInput;
use crate::number::next_number;
use repository::{NumberRowType, PurchaseOrderLineRow, RepositoryError, StorageConnection};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    InsertPurchaseOrderLineInput {
        id,
        purchase_order_id,
        item_id,
        requested_pack_size,
        requested_number_of_units,
        requested_delivery_date,
        expected_delivery_date,
        price_per_unit_before_discount,
        price_per_unit_after_discount,
        manufacturer_id,
        note,
        unit_of_packs,
        supplier_item_code,
    }: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    let line_number = next_number(
        connection,
        &NumberRowType::PurchaseOrderLine(purchase_order_id.clone()),
        store_id,
    )?;

    Ok(PurchaseOrderLineRow {
        id,
        store_id: store_id.to_string(),
        purchase_order_id,
        line_number,
        item_link_id: item_id,
        requested_number_of_units: requested_number_of_units.unwrap_or_default(),
        requested_pack_size: requested_pack_size.unwrap_or_default(),
        requested_delivery_date,
        expected_delivery_date,
        price_per_unit_after_discount: price_per_unit_after_discount.unwrap_or(0.0),
        price_per_unit_before_discount: price_per_unit_before_discount.unwrap_or(0.0),
        manufacturer_link_id: manufacturer_id,
        note,
        unit_of_packs,
        supplier_item_code,
        // Default
        item_name: "".to_string(),
        adjusted_number_of_units: None,
        received_number_of_units: 0.0,
        stock_on_hand_in_units: 0.0,
        comment: None,
    })
}

pub fn generate_from_csv(
    connection: &StorageConnection,
    store_id: &str,
    InsertPurchaseOrderLineInput {
        id,
        purchase_order_id,
        item_id,
        requested_pack_size,
        requested_number_of_units,
        price_per_unit_before_discount,
        price_per_unit_after_discount,
        unit_of_packs: _,
        manufacturer_id: _,
        note: _,
        requested_delivery_date: _,
        expected_delivery_date: _,
        supplier_item_code: _,
    }: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, RepositoryError> {
    let line_number = next_number(
        connection,
        &NumberRowType::PurchaseOrderLine(purchase_order_id.clone()),
        store_id,
    )?;

    Ok(PurchaseOrderLineRow {
        id,
        store_id: store_id.to_string(),
        purchase_order_id,
        line_number,
        item_link_id: item_id,
        requested_pack_size: requested_pack_size.unwrap_or(0.0),
        requested_number_of_units: requested_number_of_units.unwrap_or(0.0),
        price_per_unit_after_discount: price_per_unit_after_discount.unwrap_or(0.0),
        price_per_unit_before_discount: price_per_unit_before_discount.unwrap_or(0.0),
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
        unit_of_packs: None,
    })
}
