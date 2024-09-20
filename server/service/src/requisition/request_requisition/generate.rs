use chrono::Utc;
use repository::{EqualFilter, RepositoryError, RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

use crate::item_stats::{get_item_stats, ItemStatsFilter};
use crate::service_provider::ServiceContext;

use super::{generate_suggested_quantity, GenerateSuggestedQuantity, SuggestedQuantityInput};

pub fn generate_requisition_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let item_stats_rows = get_item_stats(
        ctx,
        store_id,
        None,
        Some(ItemStatsFilter::new().item_id(EqualFilter::equal_any(item_ids))),
    )?;

    let items = item_stats_rows
        .iter()
        .map(|i| {
            (
                i.item_id.clone(),
                GenerateSuggestedQuantity {
                    average_monthly_consumption: i.average_monthly_consumption,
                    available_stock_on_hand: i.available_stock_on_hand,
                },
            )
        })
        .collect();
    let suggested_quantities = generate_suggested_quantity(SuggestedQuantityInput {
        requisition: requisition_row.clone(),
        items,
    });

    let result = item_stats_rows
        .into_iter()
        .map(|item_stats| {
            let average_monthly_consumption = item_stats.average_monthly_consumption;
            let available_stock_on_hand = item_stats.available_stock_on_hand;

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                suggested_quantity: suggested_quantities
                    .get(&item_stats.item_id)
                    .map(|q| q.suggested_quantity)
                    .unwrap_or(0.0),
                item_link_id: item_stats.item_id,
                item_name: item_stats.item_name,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                // Default
                comment: None,
                supply_quantity: 0.0,
                requested_quantity: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
            }
        })
        .collect();

    Ok(result)
}
