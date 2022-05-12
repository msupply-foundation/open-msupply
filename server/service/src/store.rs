use repository::{PaginationOption, RepositoryError, Store};
use repository::{StoreFilter, StoreRepository, StoreSort};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_stores(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<StoreFilter>,
    sort: Option<StoreSort>,
) -> Result<ListResult<Store>, ListError> {
    let pagination = get_default_pagination(pagination, u32::MAX, 1)?;
    let repository = StoreRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_store(
    ctx: &ServiceContext,
    filter: StoreFilter,
) -> Result<Option<Store>, RepositoryError> {
    let mut result = StoreRepository::new(&ctx.connection).query_by_filter(filter)?;

    Ok(result.pop())
}
