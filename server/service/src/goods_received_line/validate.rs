use repository::goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus};

pub(crate) fn goods_received_is_editable(goods_received: &GoodsReceivedRow) -> bool {
    match goods_received.status {
        GoodsReceivedStatus::New => true,
        GoodsReceivedStatus::Finalised => false,
    }
}
