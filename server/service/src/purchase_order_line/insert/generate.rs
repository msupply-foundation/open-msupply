use super::InsertPurchaseOrderLineInput;
use crate::number::next_number;
use repository::{
    ItemRow, NumberRowType, PurchaseOrderLineRow, PurchaseOrderLineStatus, RepositoryError,
    StorageConnection,
};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    item: ItemRow,
    InsertPurchaseOrderLineInput {
        id,
        purchase_order_id,
        requested_pack_size,
        requested_number_of_units,
        requested_delivery_date,
        expected_delivery_date,
        price_per_pack_before_discount,
        price_per_pack_after_discount,
        manufacturer_id,
        note,
        unit,
        supplier_item_code,
        comment,
        item_id_or_code: _,
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
        item_link_id: item.id,
        item_name: item.name.clone(),
        requested_number_of_units: requested_number_of_units.unwrap_or_default(),
        requested_pack_size: requested_pack_size.unwrap_or_default(),
        requested_delivery_date,
        expected_delivery_date,
        price_per_pack_before_discount: price_per_pack_before_discount.unwrap_or(0.0),
        price_per_pack_after_discount: price_per_pack_after_discount.unwrap_or(0.0),
        manufacturer_id: manufacturer_id,
        note,
        unit,
        supplier_item_code,
        comment,
        status: PurchaseOrderLineStatus::New,
        adjusted_number_of_units: None,
        received_number_of_units: 0.0,
        stock_on_hand_in_units: 0.0,
    })
}
