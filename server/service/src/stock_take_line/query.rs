use domain::{EqualFilter, PaginationOption};
use repository::{
    RepositoryError, StockTakeLine, StockTakeLineFilter, StockTakeLineRepository, StockTakeLineSort,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_stock_take_lines(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<StockTakeLineFilter>,
    sort: Option<StockTakeLineSort>,
) -> Result<ListResult<StockTakeLine>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = StockTakeLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
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
