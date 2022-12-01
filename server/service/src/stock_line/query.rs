use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    Pagination, SingleRecordError,
};
use repository::{
    EqualFilter, PaginationOption, StockLine, StockLineFilter, StockLineRepository, StockLineSort,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_stock_line(ctx: &ServiceContext, id: String) -> Result<StockLine, SingleRecordError> {
    let mut result = StockLineRepository::new(&ctx.connection).query(
        Pagination::one(),
        Some(StockLineFilter::new().id(EqualFilter::equal_to(&id))),
        None,
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_stock_lines(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<StockLineFilter>,
    sort: Option<StockLineSort>,
) -> Result<ListResult<StockLine>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = StockLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
