use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
    RepositoryError, StorageConnection,
};

pub fn check_goods_received_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
    GoodsReceivedRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_goods_received_editable(status: &GoodsReceivedStatus) -> bool {
    matches!(status, GoodsReceivedStatus::New)
}
