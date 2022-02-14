use domain::PaginationOption;
use repository::{RepositoryError, Stocktake, StocktakeFilter, StocktakeSort};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::{
    delete::{delete_stocktake, DeleteStocktakeError},
    insert::{insert_stocktake, InsertStocktakeError, InsertStocktakeInput},
    query::{get_stocktake, get_stocktakes},
    update::{update_stocktake, UpdateStocktakeError, UpdateStocktakeInput},
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

#[cfg(test)]
mod tests;

pub trait StocktakeServiceTrait: Sync + Send {
    fn get_stocktakes(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<StocktakeFilter>,
        sort: Option<StocktakeSort>,
    ) -> Result<ListResult<Stocktake>, ListError> {
        get_stocktakes(ctx, store_id, pagination, filter, sort)
    }

    fn get_stocktake(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Option<Stocktake>, RepositoryError> {
        get_stocktake(ctx, id)
    }

    fn insert_stocktake(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertStocktakeInput,
    ) -> Result<Stocktake, InsertStocktakeError> {
        insert_stocktake(ctx, store_id, input)
    }

    /// # Arguments
    /// * store_id the current store (must match the store id of stocktake)
    /// * stocktake_id the stocktake to be deleted
    fn delete_stocktake(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stocktake_id: &str,
    ) -> Result<String, DeleteStocktakeError> {
        delete_stocktake(ctx, store_id, stocktake_id)
    }

    /// # Arguments
    /// * store_id the current store (must match the store id of stocktake)
    fn update_stocktake(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateStocktakeInput,
    ) -> Result<Stocktake, UpdateStocktakeError> {
        update_stocktake(ctx, store_id, input)
    }
}

pub struct StocktakeService {}
impl StocktakeServiceTrait for StocktakeService {}
