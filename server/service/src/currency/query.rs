use repository::{
    Currency, CurrencyFilter, CurrencyRepository, CurrencySort, EqualFilter, Pagination,
    RepositoryError,
};

use crate::{i64_to_u32, service_provider::ServiceContext, ListError, ListResult};

pub fn get_currency(
    ctx: &ServiceContext,
    currency_id: &str,
) -> Result<Option<Currency>, RepositoryError> {
    let repository = CurrencyRepository::new(&ctx.connection);

    Ok(repository
        .query_by_filter(CurrencyFilter::new().id(EqualFilter::equal_to(currency_id)))?
        .pop())
}

pub fn get_currencies(
    ctx: &ServiceContext,
    sort: Option<CurrencySort>,
) -> Result<ListResult<Currency>, ListError> {
    let pagination = Pagination::all();
    let repository = CurrencyRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, None, sort)?,
        count: i64_to_u32(repository.count(None)?),
    })
}
