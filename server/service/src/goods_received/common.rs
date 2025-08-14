use repository::{
    goods_received_row::GoodsReceivedRow, EqualFilter, GoodsReceivedFilter,
    GoodsReceivedRepository, RepositoryError, StorageConnection,
};
pub fn check_goods_received_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
    Ok(GoodsReceivedRepository::new(connection)
        .query_by_filter(GoodsReceivedFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}
