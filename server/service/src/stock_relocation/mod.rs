use self::delete::{
    delete_stock_relocation, delete_stock_relocations, DeleteStockRelocation,
    DeleteStockRelocationError,
};
use self::insert::{insert_stock_relocation, InsertStockRelocation, InsertStockRelocationError};
use self::query::{
    get_stock_relocation, get_stock_relocation_draft_lines, get_stock_relocation_lines,
    get_stock_relocations, DraftStockRelocationLine, StockRelocationDraftFilter,
};
use self::update::{update_stock_relocation, UpdateStockRelocation, UpdateStockRelocationError};
use crate::stock_relocation_line::{
    batch_stock_relocation_line, delete_stock_relocation_line, upsert_stock_relocation_line,
    BatchStockRelocationLine, BatchStockRelocationLineResult, DeleteStockRelocationLineError,
    UpsertStockRelocationLine, UpsertStockRelocationLineError,
};
use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    PaginationOption, RepositoryError, StockRelocation, StockRelocationFilter,
    StockRelocationLineRow, StockRelocationRow, StockRelocationSort,
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

    fn get_stock_relocation_lines(
        &self,
        ctx: &ServiceContext,
        stock_relocation_id: &str,
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        get_stock_relocation_lines(ctx, stock_relocation_id)
    }

    fn get_stock_relocation_draft_lines(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        filter: StockRelocationDraftFilter,
    ) -> Result<Vec<DraftStockRelocationLine>, ListError> {
        get_stock_relocation_draft_lines(ctx, store_id, filter)
    }

    fn insert_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertStockRelocation,
    ) -> Result<StockRelocationRow, InsertStockRelocationError> {
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

    fn upsert_stock_relocation_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpsertStockRelocationLine,
    ) -> Result<StockRelocationLineRow, UpsertStockRelocationLineError> {
        upsert_stock_relocation_line(ctx, store_id, input)
    }

    fn batch_stock_relocation_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: BatchStockRelocationLine,
    ) -> Result<BatchStockRelocationLineResult, RepositoryError> {
        batch_stock_relocation_line(ctx, store_id, input)
    }

    fn delete_stock_relocation_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        line_id: String,
    ) -> Result<String, DeleteStockRelocationLineError> {
        delete_stock_relocation_line(ctx, store_id, line_id)
    }

    fn delete_stock_relocation(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: DeleteStockRelocation,
    ) -> Result<String, DeleteStockRelocationError> {
        delete_stock_relocation(ctx, store_id, input)
    }

    fn delete_stock_relocations(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        ids: Vec<String>,
    ) -> Result<Vec<String>, DeleteStockRelocationError> {
        delete_stock_relocations(ctx, store_id, ids)
    }
}

pub struct StockRelocationService;
impl StockRelocationServiceTrait for StockRelocationService {}
