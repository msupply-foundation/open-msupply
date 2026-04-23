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

    let pack_size = requested_pack_size.unwrap_or_default();
    let units = requested_number_of_units.unwrap_or_default();
    let price_before = price_per_pack_before_discount.unwrap_or(0.0);
    let price_after = price_per_pack_after_discount.unwrap_or(0.0);
    let number_of_packs = if pack_size > 0.0 {
        units / pack_size
    } else {
        0.0
    };

    Ok(PurchaseOrderLineRow {
        id,
        store_id: store_id.to_string(),
        purchase_order_id,
        line_number,
        item_link_id: item.id,
        item_name: item.name.clone(),
        requested_number_of_units: units,
        requested_pack_size: pack_size,
        requested_delivery_date,
        expected_delivery_date,
        price_per_pack_before_discount: price_before,
        price_per_pack_after_discount: price_after,
        line_total: round_currency(price_after * number_of_packs),
        manufacturer_id,
        note,
        unit,
        supplier_item_code,
        comment,
        status: PurchaseOrderLineStatus::New,
        adjusted_number_of_units: None,
        stock_on_hand_in_units: 0.0,
    })
}

fn round_currency(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}
