use repository::{
    EqualFilter, PaginationOption, RepositoryError, RnRForm, RnRFormFilter, RnRFormRepository,
    RnRFormSort,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_rnr_forms(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<RnRFormFilter>,
    sort: Option<RnRFormSort>,
) -> Result<ListResult<RnRForm>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = RnRFormRepository::new(&ctx.connection);

    // ensure filter restrict results to store id
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_rnr_form(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<Option<RnRForm>, RepositoryError> {
    let repository = RnRFormRepository::new(&ctx.connection);
    let filter = RnRFormFilter::new()
        .id(EqualFilter::equal_to(&id))
        .store_id(EqualFilter::equal_to(store_id));

    Ok(repository.query_by_filter(filter)?.pop())
}
