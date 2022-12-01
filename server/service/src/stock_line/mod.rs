use self::query::{get_stock_line, get_stock_lines};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{PaginationOption, StockLine, StockLineFilter, StockLineSort};

pub mod query;
pub mod update;
pub use self::update::*;
mod validate;

pub trait StockLineServiceTrait: Sync + Send {
    fn get_stock_lines(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<StockLineFilter>,
        sort: Option<StockLineSort>,
    ) -> Result<ListResult<StockLine>, ListError> {
        get_stock_lines(ctx, pagination, filter, sort)
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
}

pub struct StockLineService {}
impl StockLineServiceTrait for StockLineService {}

#[cfg(test)]
mod tests;
