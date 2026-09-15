use repository::{
    EqualFilter, ItemFilter, ItemRepository, NumberRowType, PurchaseOrderLineRow,
    PurchaseOrderLineStatus, PurchaseOrderRow, RepositoryError, StockOnHandFilter,
    StockOnHandRepository,
};
use util::uuid::uuid;

use crate::number::next_number;
use crate::service_provider::ServiceContext;

pub fn generate_empty_purchase_order_lines(
    ctx: &ServiceContext,
    purchase_order_row: &PurchaseOrderRow,
    item_ids: Vec<String>,
) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
    let mut result: Vec<PurchaseOrderLineRow> = Vec::new();

    let stocks_on_hand = StockOnHandRepository::new(&ctx.connection).query(Some(
        StockOnHandFilter::new()
            .item_id(EqualFilter::equal_any(item_ids.clone()))
            .store_id(EqualFilter::equal_to(
                purchase_order_row.store_id.clone().to_owned(),
            )),
    ))?;

    let items = ItemRepository::new(&ctx.connection).query_by_filter(
        ItemFilter::new()
            .id(EqualFilter::equal_any(item_ids))
            .is_active(true),
        None,
    )?;

    for item in items {
        let stock_on_hand = stocks_on_hand
            .iter()
            .find(|s| s.item_id == item.item_row.id)
            .map_or(0.0, |s| s.available_stock_on_hand);
        let unit_name = item.unit_row.map(|u| u.name);
        let item_row = item.item_row;
        result.push(PurchaseOrderLineRow {
            id: uuid(),
            purchase_order_id: purchase_order_row.id.clone(),
            line_number: next_number(
                &ctx.connection,
                &NumberRowType::PurchaseOrderLine(purchase_order_row.id.clone()),
                &purchase_order_row.store_id,
            )?,
            item_id: item_row.id,
            item_name: item_row.name,
            store_id: purchase_order_row.store_id.clone(),
            status: PurchaseOrderLineStatus::New,
            // Default
            requested_delivery_date: None,
            expected_delivery_date: None,
            requested_pack_size: item_row.default_pack_size,
            requested_number_of_units: 0.0,
            adjusted_number_of_units: None,
            stock_on_hand_in_units: stock_on_hand,
            supplier_item_code: None,
            price_per_pack_before_discount: 0.0,
            price_per_pack_after_discount: 0.0,
            comment: None,
            manufacturer_id: None,
            note: None,
            unit: unit_name,
        });
    }

    Ok(result)
}
