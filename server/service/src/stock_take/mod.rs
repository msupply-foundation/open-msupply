use domain::PaginationOption;
use repository::{RepositoryError, StockTake, StockTakeFilter, StockTakeSort};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::{
    delete::{delete_stock_take, DeleteStockTakeError, DeleteStockTakeInput},
    insert::{insert_stock_take, InsertStockTakeError, InsertStockTakeInput},
    query::{get_stock_take, get_stock_takes},
    update::{update_stock_take, UpdateStockTakeError, UpdateStockTakeInput},
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

#[cfg(test)]
mod tests;

pub trait StockTakeServiceTrait: Sync + Send {
    fn get_stock_takes(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<StockTakeFilter>,
        sort: Option<StockTakeSort>,
    ) -> Result<ListResult<StockTake>, ListError> {
        get_stock_takes(ctx, pagination, filter, sort)
    }

    fn get_stock_take(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Option<StockTake>, RepositoryError> {
        get_stock_take(ctx, id)
    }

    fn insert_stock_take(
        &self,
        ctx: &ServiceContext,
        input: InsertStockTakeInput,
    ) -> Result<StockTake, InsertStockTakeError> {
        insert_stock_take(ctx, input)
    }

    fn delete_stock_take(
        &self,
        ctx: &ServiceContext,
        input: DeleteStockTakeInput,
    ) -> Result<String, DeleteStockTakeError> {
        delete_stock_take(ctx, input)
    }

    fn update_stock_take(
        &self,
        ctx: &ServiceContext,
        input: UpdateStockTakeInput,
    ) -> Result<StockTake, UpdateStockTakeError> {
        update_stock_take(ctx, input)
    }
}

pub struct StockTakeService {}
impl StockTakeServiceTrait for StockTakeService {}
