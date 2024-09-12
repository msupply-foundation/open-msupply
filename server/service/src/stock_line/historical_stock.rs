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
        Some(StockLineFilter::new().store_id(EqualFilter::equal_to(&store_id))),
        None,
        Some(store_id.clone()),
    )?;

    println!("current_stock_lines: {:?}", current_stock_lines);

    let stock_line_ids: Vec<String> = current_stock_lines
        .rows
        .iter()
        .map(|stock_line| stock_line.stock_line_row.id.clone())
        .collect();

    let filter = StockMovementFilter::new()
        .store_id(EqualFilter::equal_to(&store_id))
        .item_id(EqualFilter::equal_to(&item_id))
        .datetime(DatetimeFilter::date_range(datetime, date_now().into()));
    let stock_movements = StockMovementRepository::new(&ctx.connection).query(Some(filter))?;

    println!("stock_movements: {:?}", stock_movements);

    Ok(ListResult {
        rows: vec![],
        count: 0,
    })
}
