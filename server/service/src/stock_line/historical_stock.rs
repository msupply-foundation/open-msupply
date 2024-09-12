use std::collections::HashMap;

use chrono::NaiveDateTime;
use repository::{
    DatetimeFilter, EqualFilter, StockLine, StockLineFilter, StockMovementFilter,
    StockMovementRepository,
};
use util::date_now;

use crate::{service_provider::ServiceContext, ListError, ListResult};

use super::query::get_stock_lines;

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
    let stock_movements = StockMovementRepository::new(&ctx.connection).query(Some(filter))?;

    // Calculate how much each stock line has been adjusted
    let mut stock_line_adjustments: HashMap<String, f64> = HashMap::new();
    for stock_movement in stock_movements {
        let stock_line_id = stock_movement.stock_line_id.clone();
        let quantity = stock_movement.quantity;
        let adjustment = stock_line_adjustments.get(&stock_line_id).unwrap_or(&0.0) + quantity;
        stock_line_adjustments.insert(stock_line_id, adjustment);
    }

    // Create the historical stock lines, adjusted by the stock available then and now
    let mut historical_stock_lines: Vec<StockLine> = vec![];
    for stock_line in current_stock_lines.rows {
        let stock_line_id = stock_line.stock_line_row.id.clone();
        let adjustment = stock_line_adjustments.get(&stock_line_id).unwrap_or(&0.0);
        let historical_available_packs = stock_line.stock_line_row.available_number_of_packs
            - adjustment / stock_line.stock_line_row.pack_size;

        if historical_available_packs > 0.0 {
            // There was stock available at this time, so we should create a historical stock line
            let mut new_stock_line = stock_line.clone();
            if historical_available_packs < stock_line.stock_line_row.available_number_of_packs {
                // If we have less stock available now than we did then, we don't want to show it as available back then
                new_stock_line.stock_line_row.available_number_of_packs =
                    historical_available_packs;
            }

            historical_stock_lines.push(new_stock_line);
        }
    }

    Ok(ListResult {
        count: historical_stock_lines.len() as u32,
        rows: historical_stock_lines,
    })
}
