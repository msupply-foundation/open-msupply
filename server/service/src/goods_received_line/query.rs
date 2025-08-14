use crate::{get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListResult};

use repository::{
    EqualFilter, GoodsReceivedLine, GoodsReceivedLineFilter, GoodsReceivedLineRepository,
    GoodsReceivedLineSort, PaginationOption, RepositoryError,
};

use crate::ListError;

pub fn get_goods_received_lines(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<GoodsReceivedLineFilter>,
    sort: Option<GoodsReceivedLineSort>,
) -> Result<ListResult<GoodsReceivedLine>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.goods_received_id = goods_received_id_option.map(EqualFilter::equal_to);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_goods_received_line(
    ctx: &ServiceContext,
    goods_received_id_option: Option<&str>,
    id: &str,
) -> Result<Option<GoodsReceivedLine>, RepositoryError> {
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);
    let mut filter = GoodsReceivedLineFilter::new().id(EqualFilter::equal_to(id));
    filter.goods_received_id = goods_received_id_option.map(EqualFilter::equal_to);

    Ok(repository.query_by_filter(filter)?.pop())
}
// TODO Add tests (can copy pattern in purchase_order_line query and goods_received query)
// This is recorded in issue 8869 https://github.com/msupply-foundation/open-msupply/issues/8869
