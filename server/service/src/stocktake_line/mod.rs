use repository::PaginationOption;
use repository::{RepositoryError, StocktakeLine, StocktakeLineFilter, StocktakeLineSort};

use crate::{service_provider::ServiceContext, ListResult};

pub mod query;
pub mod validate;

mod delete;
pub use self::delete::*;

mod insert;
pub use self::insert::*;

mod update;
use self::query::{get_stocktake_line, get_stocktake_lines, GetStocktakeLinesError};
pub use self::update::*;

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
        store_id: &str,
        id: String,
    ) -> Result<Option<StocktakeLine>, RepositoryError> {
        get_stocktake_line(ctx, id, store_id)
    }

    fn insert_stocktake_line(
        &self,
        ctx: &ServiceContext,
        input: InsertStocktakeLine,
    ) -> Result<StocktakeLine, InsertStocktakeLineError> {
        insert_stocktake_line(ctx, input)
    }

    fn update_stocktake_line(
        &self,
        ctx: &ServiceContext,
        input: UpdateStocktakeLine,
    ) -> Result<StocktakeLine, UpdateStocktakeLineError> {
        update_stocktake_line(ctx, input)
    }

    fn delete_stocktake_line(
        &self,
        ctx: &ServiceContext,
        stocktake_line_id: String,
    ) -> Result<String, DeleteStocktakeLineError> {
        delete_stocktake_line(ctx, stocktake_line_id)
    }
}

pub struct StocktakeLineService {}
impl StocktakeLineServiceTrait for StocktakeLineService {}
