use super::DeleteGoodsReceivedError;
use crate::{
    goods_received::common::{check_goods_received_editable, check_goods_received_exists},
    validate::check_store_id_matches,
};
use repository::{goods_received_row::GoodsReceivedRow, StorageConnection};

pub fn validate(
    id: &str,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<GoodsReceivedRow, DeleteGoodsReceivedError> {
    use DeleteGoodsReceivedError::*;

    let goods_received =
        check_goods_received_exists(id, connection)?.ok_or(GoodsReceivedDoesNotExist)?;
    if !check_store_id_matches(&goods_received.store_id, store_id) {
        return Err(NotThisStoreGoodsReceived);
    }
    if !check_goods_received_editable(&goods_received.status) {
        return Err(CannotEditFinalised);
    }
    Ok(goods_received)
}
