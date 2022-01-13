use domain::PaginationOption;
use repository::{RepositoryError, StockTakeLine, StockTakeLineFilter, StockTakeLineSort};

use crate::{service_provider::ServiceContext, ListResult};

use self::{
    delete::{delete_stock_take_line, DeleteStockTakeLineError},
    insert::{insert_stock_take_line, InsertStockTakeLineError, InsertStockTakeLineInput},
    query::{get_stock_take_line, get_stock_take_lines, GetStockTakeLinesError},
    update::{update_stock_take_line, UpdateStockTakeLineError, UpdateStockTakeLineInput},
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

#[cfg(test)]
mod tests;

pub trait StockTakeLineServiceTrait: Sync + Send {
    fn get_stock_take_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stock_take_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<StockTakeLineFilter>,
        sort: Option<StockTakeLineSort>,
    ) -> Result<ListResult<StockTakeLine>, GetStockTakeLinesError> {
        get_stock_take_lines(ctx, store_id, stock_take_id, pagination, filter, sort)
    }

    fn get_stock_take_line(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Option<StockTakeLine>, RepositoryError> {
        get_stock_take_line(ctx, id)
    }

    fn insert_stock_take_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertStockTakeLineInput,
    ) -> Result<StockTakeLine, InsertStockTakeLineError> {
        insert_stock_take_line(ctx, store_id, input)
    }

    fn update_stock_take_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateStockTakeLineInput,
    ) -> Result<StockTakeLine, UpdateStockTakeLineError> {
        update_stock_take_line(ctx, store_id, input)
    }

    fn delete_stock_take_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stock_take_line_id: &str,
    ) -> Result<String, DeleteStockTakeLineError> {
        delete_stock_take_line(ctx, store_id, stock_take_line_id)
    }
}

pub struct StockTakeLineService {}
impl StockTakeLineServiceTrait for StockTakeLineService {}
