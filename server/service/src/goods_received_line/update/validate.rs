use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineRowRepository},
    goods_received_row::GoodsReceivedRowRepository,
    StorageConnection,
};

use super::{UpdateGoodsReceivedLineError, UpdateGoodsReceivedLineInput};

pub fn validate(
    input: &UpdateGoodsReceivedLineInput,
    connection: &StorageConnection,
) -> Result<GoodsReceivedLineRow, UpdateGoodsReceivedLineError> {
    let existing_line = GoodsReceivedLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .ok_or(UpdateGoodsReceivedLineError::GoodsReceivedLineDoesNotExist)?;

    GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&existing_line.goods_received_id)?
        .ok_or(UpdateGoodsReceivedLineError::GoodsReceivedDoesNotExist)?;

    Ok(existing_line)
}
