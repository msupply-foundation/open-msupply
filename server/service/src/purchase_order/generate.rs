use repository::{
    EqualFilter, ItemRowRepository, NumberRowType, PurchaseOrderLineRow, PurchaseOrderRow,
    RepositoryError, StockOnHandFilter, StockOnHandRepository,
};
use util::uuid::uuid;

use crate::number::next_number;
use crate::service_provider::ServiceContext;
use crate::store_preference::get_store_preferences;

pub fn generate_empty_purchase_order_lines(
    ctx: &ServiceContext,
    purchase_order_row: &PurchaseOrderRow,
    item_ids: Vec<String>,
) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
    let mut result: Vec<PurchaseOrderLineRow> = Vec::new();
    let store_preferences = get_store_preferences(&ctx.connection, &purchase_order_row.store_id)?;

    let mut line_number = next_number(
        &ctx.connection,
        &NumberRowType::PurchaseOrderLine(purchase_order_row.id.clone()),
        &purchase_order_row.store_id,
    )?;

    let stocks_on_hand = StockOnHandRepository::new(&ctx.connection).query(Some(
        StockOnHandFilter::new()
            .item_id(EqualFilter::equal_any(item_ids.clone()))
            .store_id(EqualFilter::equal_to(&purchase_order_row.store_id.clone())),
    ))?;

    item_ids.into_iter().for_each(|item_id| {
        match ItemRowRepository::new(&ctx.connection).find_active_by_id(&item_id) {
            Ok(Some(item)) => {
                let default_pack_size = match store_preferences.pack_to_one {
                    true => 1.0,
                    false => item.default_pack_size,
                };

                let stock_on_hand = stocks_on_hand
                    .iter()
                    .find(|s| s.item_id == item.id)
                    .map_or(0.0, |s| s.available_stock_on_hand);
                result.push(PurchaseOrderLineRow {
                    id: uuid(),
                    purchase_order_id: purchase_order_row.id.clone(),
                    line_number: line_number,
                    item_link_id: item.id,
                    item_name: item.name,
                    store_id: ctx.store_id.clone(),
                    requested_delivery_date: None,
                    expected_delivery_date: None,
                    requested_pack_size: default_pack_size,
                    requested_number_of_units: 0.0,
                    authorised_number_of_units: None,
                    received_number_of_units: 0.0,
                    stock_on_hand_in_units: stock_on_hand,
                    supplier_item_code: None,
                    price_per_unit_before_discount: 0.0,
                    price_per_unit_after_discount: 0.0,
                });
            }
            Ok(None) => {}
            Err(_error) => {}
        };
        // TODO confirm this is a safe way to manage incrementing line numbers
        line_number += 1;
    });

    Ok(result)
}
