use repository::{
    ItemRowRepository, NumberRowType, PurchaseOrderLineRow, PurchaseOrderRow, RepositoryError,
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

    item_ids.into_iter().for_each(|item_id| {
        match ItemRowRepository::new(&ctx.connection).find_active_by_id(&item_id) {
            Ok(Some(item)) => {
                let default_pack_size = match store_preferences.pack_to_one {
                    true => 1.0,
                    false => item.default_pack_size,
                };
                result.push(PurchaseOrderLineRow {
                    id: uuid(),
                    purchase_order_id: purchase_order_row.id.clone(),
                    line_number: line_number,
                    item_link_id: item.id,
                    item_name: Some(item.name),
                    // TODO maybe these should not be optional - but use default of 0.0 as per OG
                    number_of_packs: None,
                    pack_size: Some(default_pack_size),
                    requested_quantity: None,
                    authorised_quantity: None,
                    total_received: None,
                    requested_delivery_date: None,
                    expected_delivery_date: None,
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
