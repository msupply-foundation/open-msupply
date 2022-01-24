use domain::{EqualFilter, PaginationOption};
use repository::{RepositoryError, StockTake, StockTakeFilter, StockTakeRepository, StockTakeSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_stock_takes(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<StockTakeFilter>,
    sort: Option<StockTakeSort>,
) -> Result<ListResult<StockTake>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = StockTakeRepository::new(&ctx.connection);

    // ensure filter restrict results to store id
    let filter = filter
        .unwrap_or(StockTakeFilter::new())
        .store_id(EqualFilter::equal_to(store_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_stock_take(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<StockTake>, RepositoryError> {
    let repository = StockTakeRepository::new(&ctx.connection);
    Ok(repository
        .query_by_filter(StockTakeFilter::new().id(EqualFilter::equal_to(&id)))?
        .pop())
}
