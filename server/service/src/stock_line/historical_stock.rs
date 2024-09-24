use std::collections::HashMap;

use chrono::NaiveDateTime;
use repository::{
    DatetimeFilter, EqualFilter, StockLine, StockLineFilter, StockMovementFilter,
    StockMovementRepository,
};
use util::date_now;

use crate::{service_provider::ServiceContext, ListError, ListResult};

use super::query::get_stock_lines;

/// Get historical stock lines for a given store and item at a given datetime.
/// NOTE: Stock lines are only adjusted based on stock movements, changes to batch, expiry dates etc are not considered.
pub fn get_historical_stock_lines(
    ctx: &ServiceContext,
    store_id: String,
    item_id: String,
    datetime: NaiveDateTime,
) -> Result<ListResult<StockLine>, ListError> {
    // First get the current stock lines
    let current_stock_lines = get_stock_lines(
        ctx,
        None,
        Some(
            StockLineFilter::new()
                .store_id(EqualFilter::equal_to(&store_id))
                .item_id(EqualFilter::equal_to(&item_id))
                .is_available(true),
        ),
        None,
        Some(store_id.clone()),
    )?;

    let stock_line_ids: Vec<String> = current_stock_lines
        .rows
        .iter()
        .map(|stock_line| stock_line.stock_line_row.id.clone())
        .collect();

    // Get all stock movements (aka changes) for the stock lines
    let filter = StockMovementFilter::new()
        .store_id(EqualFilter::equal_to(&store_id))
        .item_id(EqualFilter::equal_to(&item_id))
        .stock_line_id(EqualFilter::equal_any(stock_line_ids))
        .datetime(DatetimeFilter::date_range(datetime, date_now().into()));
    let mut stock_movements = StockMovementRepository::new(&ctx.connection).query(Some(filter))?;

    // sort stock movements by datetime descending (latest first)
    stock_movements.sort_by(|a, b| b.datetime.cmp(&a.datetime)); // TODO: Move this to the repository layer if sorting is added there...

    let mut available_stock_by_line: HashMap<String, f64> = HashMap::new();
    let mut min_available_stock_by_line: HashMap<String, f64> = HashMap::new();
    // Calculate available stock for each stock line currently
    for stock_line in current_stock_lines.rows.iter() {
        let available_stock_now = stock_line.stock_line_row.available_number_of_packs
            * stock_line.stock_line_row.pack_size;
        available_stock_by_line.insert(stock_line.stock_line_row.id.clone(), available_stock_now);
        min_available_stock_by_line
            .insert(stock_line.stock_line_row.id.clone(), available_stock_now);
    }

    // Calculate min available stock for each stock line for each stock movement
    for stock_movement in stock_movements {
        let stock_line_id = stock_movement.stock_line_id.unwrap_or_default(); // Stock line ID shouldn't be null due to the repository filter applied...
        let available_stock =
            available_stock_by_line.get(&stock_line_id).unwrap_or(&0.0) - stock_movement.quantity;

        if available_stock
            < *min_available_stock_by_line
                .get(&stock_line_id)
                .unwrap_or(&0.0)
        {
            min_available_stock_by_line.insert(stock_line_id.clone(), available_stock);
        }
        available_stock_by_line.insert(stock_line_id, available_stock);
    }

    // Create the historical stock lines, adjust what can be allocated at that time, based on stock available then and now
    let mut adjusted_stock_lines: Vec<StockLine> = vec![];
    for stock_line in current_stock_lines.rows {
        let stock_line_id = stock_line.stock_line_row.id.clone();

        let historical_available_packs = *min_available_stock_by_line
            .get(&stock_line_id)
            .unwrap_or(&0.0)
            / stock_line.stock_line_row.pack_size;

        // Create a new stock line with the adjusted available stock (lines introduced since the datetime will still show up, but should 0 available stock)
        let mut new_stock_line = stock_line.clone();
        new_stock_line.stock_line_row.available_number_of_packs = historical_available_packs;
        adjusted_stock_lines.push(new_stock_line);
    }

    Ok(ListResult {
        count: adjusted_stock_lines.len() as u32,
        rows: adjusted_stock_lines,
    })
}
