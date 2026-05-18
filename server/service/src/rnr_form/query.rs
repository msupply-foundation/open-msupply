use repository::{
    EqualFilter, PaginationOption, RepositoryError, RnRForm, RnRFormFilter, RnRFormRepository,
    RnRFormSort,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_rnr_forms(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<RnRFormFilter>,
    sort: Option<RnRFormSort>,
) -> Result<ListResult<RnRForm>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = RnRFormRepository::new(&ctx.connection);

    // ensure filter restrict results to store id
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id.to_string()));

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
        .id(EqualFilter::equal_to(id.to_string()))
        .store_id(EqualFilter::equal_to(store_id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}
