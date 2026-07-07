use self::delete::{delete_stock_relocation, DeleteStockRelocation, DeleteStockRelocationError};
use self::insert::{insert_stock_relocation, InsertStockRelocation, InsertStockRelocationError};
use self::query::{get_stock_relocation, get_stock_relocations};
use self::update::{update_stock_relocation, UpdateStockRelocation, UpdateStockRelocationError};
use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    PaginationOption, RepositoryError, StockRelocation, StockRelocationFilter, StockRelocationRow,
    StockRelocationSort,
};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

pub trait StockRelocationServiceTrait: Sync + Send {
    fn get_stock_relocations(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<StockRelocationFilter>,
        sort: Option<StockRelocationSort>,
    ) -> Result<ListResult<StockRelocation>, ListError> {
        get_stock_relocations(ctx, store_id, pagination, filter, sort)
    }

    fn get_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        id: &str,
    ) -> Result<Option<StockRelocation>, RepositoryError> {
        get_stock_relocation(ctx, store_id, id)
    }

    fn insert_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertStockRelocation,
    ) -> Result<Vec<StockRelocationRow>, InsertStockRelocationError> {
        insert_stock_relocation(ctx, store_id, input)
    }

    fn update_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateStockRelocation,
    ) -> Result<StockRelocationRow, UpdateStockRelocationError> {
        update_stock_relocation(ctx, store_id, input)
    }

    fn delete_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: DeleteStockRelocation,
    ) -> Result<String, DeleteStockRelocationError> {
        delete_stock_relocation(ctx, store_id, input)
    }
}

pub struct StockRelocationService;
impl StockRelocationServiceTrait for StockRelocationService {}
