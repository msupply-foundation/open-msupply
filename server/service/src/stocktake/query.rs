use repository::{EqualFilter, PaginationOption};
use repository::{RepositoryError, Stocktake, StocktakeFilter, StocktakeRepository, StocktakeSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_stocktakes(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<StocktakeFilter>,
    sort: Option<StocktakeSort>,
) -> Result<ListResult<Stocktake>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = StocktakeRepository::new(&ctx.connection);

    // ensure filter restrict results to store id
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_stocktake(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<Stocktake>, RepositoryError> {
    let repository = StocktakeRepository::new(&ctx.connection);
    Ok(repository
        .query_by_filter(StocktakeFilter::new().id(EqualFilter::equal_to(&id)))?
        .pop())
}
