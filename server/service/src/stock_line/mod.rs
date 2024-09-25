use self::query::{get_stock_line, get_stock_lines};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use historical_stock::get_historical_stock_lines;
use repository::{PaginationOption, StockLine, StockLineFilter, StockLineSort};

pub mod historical_stock;
pub mod query;
pub mod update;
pub use self::update::*;

pub trait StockLineServiceTrait: Sync + Send {
    fn get_stock_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<StockLineFilter>,
        sort: Option<StockLineSort>,
        store_id: Option<String>,
    ) -> Result<ListResult<StockLine>, ListError> {
        get_stock_lines(ctx, pagination, filter, sort, store_id)
    }

    fn get_stock_line(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<StockLine, SingleRecordError> {
        get_stock_line(ctx, id)
    }

    fn update_stock_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateStockLine,
    ) -> Result<StockLine, UpdateStockLineError> {
        update_stock_line(ctx, input)
    }

    fn get_historical_stock_lines(
        &self,
        ctx: &ServiceContext,
        store_id: String,
        item_id: String,
        datetime: NaiveDateTime,
    ) -> Result<ListResult<StockLine>, ListError> {
        Ok(get_historical_stock_lines(
            ctx, &store_id, &item_id, &datetime,
        )?)
    }
}

pub struct StockLineService {}
impl StockLineServiceTrait for StockLineService {}

#[cfg(test)]
mod tests;
