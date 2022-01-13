use domain::{EqualFilter, PaginationOption};
use repository::{
    RepositoryError, StockTakeLine, StockTakeLineFilter, StockTakeLineRepository,
    StockTakeLineSort, StockTakeRepository,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug, PartialEq)]
pub enum GetStockTakeLinesError {
    DatabaseError(RepositoryError),
    /// Stock take doesn't belong to the specified store
    InvalidStore,
    InvalidStockTake,
    ListError(ListError),
}

pub fn get_stock_take_lines(
    ctx: &ServiceContext,
    store_id: &str,
    stock_take_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<StockTakeLineFilter>,
    sort: Option<StockTakeLineSort>,
) -> Result<ListResult<StockTakeLine>, GetStockTakeLinesError> {
    let stock_take =
        match StockTakeRepository::new(&ctx.connection).find_one_by_id(stock_take_id)? {
            Some(stock_take) => stock_take,
            None => return Err(GetStockTakeLinesError::InvalidStockTake),
        };
    if stock_take.store_id != store_id {
        return Err(GetStockTakeLinesError::InvalidStore);
    }
    let filter = filter
        .unwrap_or(StockTakeLineFilter::new())
        .stock_take_id(EqualFilter::equal_to(stock_take_id));
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)
        .map_err(|err| GetStockTakeLinesError::ListError(err))?;
    let repository = StockTakeLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_stock_take_line(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<StockTakeLine>, RepositoryError> {
    let repository = StockTakeLineRepository::new(&ctx.connection);
    Ok(repository
        .query_by_filter(StockTakeLineFilter::new().id(EqualFilter::equal_to(&id)))?
        .pop())
}

impl From<RepositoryError> for GetStockTakeLinesError {
    fn from(error: RepositoryError) -> Self {
        GetStockTakeLinesError::DatabaseError(error)
    }
}
