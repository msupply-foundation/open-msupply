use chrono::Utc;
use repository::EqualFilter;
use repository::{
    schema::{RequisitionLineRow, RequisitionRow},
    ItemStatsFilter, ItemStatsRepository, RepositoryError, StorageConnection,
};

use util::uuid::uuid;

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

    if months_of_stock > min_months_of_stock || months_of_stock > max_months_of_stock {
        return 0;
    }

    ((max_months_of_stock - months_of_stock) * average_monthly_consumption as f64) as i32
}

pub fn generate_requisition_lines(
    connection: &StorageConnection,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let repository = ItemStatsRepository::new(&connection);

    let filter = ItemStatsFilter::new().item_id(EqualFilter::equal_any(item_ids));
    let item_stats_rows = repository.query(store_id, None, Some(filter))?;

    let result = item_stats_rows
        .into_iter()
        .map(|item_stats| {
            let average_monthly_consumption = item_stats.average_monthly_consumption();
            let available_stock_on_hand = item_stats.available_stock_on_hand();
            let suggested_quantity = generate_suggested_quantity(GenerateSuggestedQuantity {
                average_monthly_consumption: average_monthly_consumption.clone(),
                available_stock_on_hand: available_stock_on_hand.clone(),
                min_months_of_stock: requisition_row.min_months_of_stock.clone(),
                max_months_of_stock: requisition_row.max_months_of_stock.clone(),
            });

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_id: item_stats.item_id,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                // Default
                comment: None,
                supply_quantity: 0,
                requested_quantity: 0,
            }
        })
        .collect();

    Ok(result)
}
