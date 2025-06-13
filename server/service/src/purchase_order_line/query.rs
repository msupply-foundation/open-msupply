use repository::{
    EqualFilter, PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineSort, RepositoryError,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_purchase_order_lines(
    ctx: &ServiceContext,
    _store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<PurchaseOrderLineFilter>,
    sort: Option<PurchaseOrderLineSort>,
) -> Result<ListResult<PurchaseOrderLine>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);

    let filter = filter.unwrap_or_default();

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_purchase_order_line(
    ctx: &ServiceContext,
    _store_id: &str,
    id: &str,
) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);
    let filter = PurchaseOrderLineFilter::new().id(EqualFilter::equal_to(id));
    Ok(repository.query_by_filter(filter)?.pop())
}
