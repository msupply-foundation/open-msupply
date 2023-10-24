use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::PaginationOption;
use repository::{RepositoryError, Stocktake, StocktakeFilter, StocktakeSort};

pub mod query;
pub mod validate;

mod delete;
pub use self::delete::*;

mod insert;
pub use self::insert::*;

mod update;
use self::query::{get_stocktake, get_stocktakes};
pub use self::update::*;

mod batch;
pub use self::batch::*;

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
        input: InsertStocktake,
    ) -> Result<Stocktake, InsertStocktakeError> {
        insert_stocktake(ctx, input)
    }

    /// # Arguments
    /// * store_id the current store (must match the store id of stocktake)
    /// * stocktake_id the stocktake to be deleted
    fn delete_stocktake(
        &self,
        ctx: &ServiceContext,
        stocktake_id: String,
    ) -> Result<String, DeleteStocktakeError> {
        delete_stocktake(ctx, stocktake_id)
    }

    /// # Arguments
    /// * store_id the current store (must match the store id of stocktake)
    fn update_stocktake(
        &self,
        ctx: &ServiceContext,
        input: UpdateStocktake,
    ) -> Result<Stocktake, UpdateStocktakeError> {
        update_stocktake(ctx, input)
    }

    fn batch_stocktake(
        &self,
        ctx: &ServiceContext,
        input: BatchStocktake,
    ) -> Result<BatchStocktakeResult, RepositoryError> {
        batch_stocktake(ctx, input)
    }
}

pub struct StocktakeService {}
impl StocktakeServiceTrait for StocktakeService {}
