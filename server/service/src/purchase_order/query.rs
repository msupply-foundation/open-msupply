use repository::{
    EqualFilter, PaginationOption, PurchaseOrderFilter, PurchaseOrderRepository, PurchaseOrderRow,
    PurchaseOrderSort, RepositoryError,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_purchase_orders(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<PurchaseOrderFilter>,
    sort: Option<PurchaseOrderSort>,
) -> Result<ListResult<PurchaseOrderRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = PurchaseOrderRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = Some(EqualFilter::equal_to(store_id));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_purchase_order(
    ctx: &ServiceContext,
    _store_id: &str,
    id: &str,
) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
    let repository = PurchaseOrderRepository::new(&ctx.connection);
    //TODO filter by store id?
    let filter = PurchaseOrderFilter::new().id(EqualFilter::equal_to(id));
    Ok(repository.query_by_filter(filter)?.pop())
}
