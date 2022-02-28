use repository::PaginationOption;
use repository::{RepositoryError, StocktakeLine, StocktakeLineFilter, StocktakeLineSort};

use crate::{service_provider::ServiceContext, ListResult};

use self::{
    delete::{delete_stocktake_line, DeleteStocktakeLineError},
    insert::{insert_stocktake_line, InsertStocktakeLineError, InsertStocktakeLineInput},
    query::{get_stocktake_line, get_stocktake_lines, GetStocktakeLinesError},
    update::{update_stocktake_line, UpdateStocktakeLineError, UpdateStocktakeLineInput},
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

#[cfg(test)]
mod tests;

pub trait StocktakeLineServiceTrait: Sync + Send {
    fn get_stocktake_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stocktake_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<StocktakeLineFilter>,
        sort: Option<StocktakeLineSort>,
    ) -> Result<ListResult<StocktakeLine>, GetStocktakeLinesError> {
        get_stocktake_lines(ctx, store_id, stocktake_id, pagination, filter, sort)
    }

    fn get_stocktake_line(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Option<StocktakeLine>, RepositoryError> {
        get_stocktake_line(ctx, id)
    }

    fn insert_stocktake_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertStocktakeLineInput,
    ) -> Result<StocktakeLine, InsertStocktakeLineError> {
        insert_stocktake_line(ctx, store_id, input)
    }

    fn update_stocktake_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateStocktakeLineInput,
    ) -> Result<StocktakeLine, UpdateStocktakeLineError> {
        update_stocktake_line(ctx, store_id, input)
    }

    fn delete_stocktake_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stocktake_line_id: &str,
    ) -> Result<String, DeleteStocktakeLineError> {
        delete_stocktake_line(ctx, store_id, stocktake_line_id)
    }
}

pub struct StocktakeLineService {}
impl StocktakeLineServiceTrait for StocktakeLineService {}
