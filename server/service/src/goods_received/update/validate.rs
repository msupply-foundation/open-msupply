use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository},
    StorageConnection,
};

use crate::goods_received::update::{UpdateGoodsReceivedError, UpdateGoodsReceivedInput};

pub fn validate(
    input: &UpdateGoodsReceivedInput,
    connection: &StorageConnection,
) -> Result<GoodsReceivedRow, UpdateGoodsReceivedError> {
    let goods_received = GoodsReceivedRowRepository::new(connection).find_one_by_id(&input.id)?;
    let goods_received =
        goods_received.ok_or(UpdateGoodsReceivedError::GoodsReceivedDoesNotExist)?;

    Ok(goods_received)
}
