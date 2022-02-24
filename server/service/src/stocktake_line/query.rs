use repository::{EqualFilter, PaginationOption};
use repository::{
    RepositoryError, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineSort, StocktakeRepository,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug, PartialEq)]
pub enum GetStocktakeLinesError {
    DatabaseError(RepositoryError),
    /// Stocktake doesn't belong to the specified store
    InvalidStore,
    InvalidStocktake,
    ListError(ListError),
}

pub fn get_stocktake_lines(
    ctx: &ServiceContext,
    store_id: &str,
    stocktake_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<StocktakeLineFilter>,
    sort: Option<StocktakeLineSort>,
) -> Result<ListResult<StocktakeLine>, GetStocktakeLinesError> {
    let stocktake = match StocktakeRepository::new(&ctx.connection).find_one_by_id(stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(GetStocktakeLinesError::InvalidStocktake),
    };
    if stocktake.store_id != store_id {
        return Err(GetStocktakeLinesError::InvalidStore);
    }
    let filter = filter
        .unwrap_or(StocktakeLineFilter::new())
        .stocktake_id(EqualFilter::equal_to(stocktake_id));
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)
        .map_err(|err| GetStocktakeLinesError::ListError(err))?;
    let repository = StocktakeLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_stocktake_line(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<StocktakeLine>, RepositoryError> {
    let repository = StocktakeLineRepository::new(&ctx.connection);
    Ok(repository
        .query_by_filter(StocktakeLineFilter::new().id(EqualFilter::equal_to(&id)))?
        .pop())
}

impl From<RepositoryError> for GetStocktakeLinesError {
    fn from(error: RepositoryError) -> Self {
        GetStocktakeLinesError::DatabaseError(error)
    }
}
