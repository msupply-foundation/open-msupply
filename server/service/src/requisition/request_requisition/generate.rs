use chrono::Utc;
use repository::{EqualFilter, RepositoryError, RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

use crate::item_stats::{get_item_stats, ItemStatsFilter};
use crate::service_provider::ServiceContext;

pub struct GenerateSuggestedQuantity {
    pub average_monthly_consumption: i32,
    pub available_stock_on_hand: i32,
    pub min_months_of_stock: f64,
    pub max_months_of_stock: f64,
}

pub fn generate_suggested_quantity(
    GenerateSuggestedQuantity {
        average_monthly_consumption,
        available_stock_on_hand,
        min_months_of_stock,
        max_months_of_stock,
    }: GenerateSuggestedQuantity,
) -> i32 {
    if average_monthly_consumption == 0 {
        return 0;
    }
    let months_of_stock = available_stock_on_hand as f64 / average_monthly_consumption as f64;

    let default_min_months_of_stock = if min_months_of_stock == 0.0 {
        max_months_of_stock
    } else {
        min_months_of_stock
    };

    if max_months_of_stock == 0.0 || (months_of_stock > default_min_months_of_stock) {
        return 0;
    }

    ((max_months_of_stock - months_of_stock) * average_monthly_consumption as f64) as i32
}

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

    let result = item_stats_rows
        .into_iter()
        .map(|item_stats| {
            let average_monthly_consumption = item_stats.average_monthly_consumption as i32;
            let available_stock_on_hand = item_stats.available_stock_on_hand as i32;
            let suggested_quantity = generate_suggested_quantity(GenerateSuggestedQuantity {
                average_monthly_consumption,
                available_stock_on_hand,
                min_months_of_stock: requisition_row.min_months_of_stock,
                max_months_of_stock: requisition_row.max_months_of_stock,
            });

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item_stats.item_id,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                // Default
                comment: None,
                supply_quantity: 0,
                requested_quantity: 0,
                approved_quantity: 0,
                approval_comment: None,
            }
        })
        .collect();

    Ok(result)
}
