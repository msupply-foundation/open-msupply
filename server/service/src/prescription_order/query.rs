use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, PrescriptionOrder, PrescriptionOrderFilter,
    PrescriptionOrderRepository, PrescriptionOrderSort, RepositoryError,
};

pub fn get_prescription_orders(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<PrescriptionOrderFilter>,
    sort: Option<PrescriptionOrderSort>,
) -> Result<ListResult<PrescriptionOrder>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = PrescriptionOrderRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_prescription_order(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    id: &str,
) -> Result<Option<PrescriptionOrder>, RepositoryError> {
    let repository = PrescriptionOrderRepository::new(&ctx.connection);
    let mut filter = PrescriptionOrderFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}
