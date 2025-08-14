use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineRowRepository},
    goods_received_row::{GoodsReceivedRowRepository, GoodsReceivedStatus},
    StorageConnection,
};

use super::{DeleteGoodsReceivedLineError, DeleteGoodsReceivedLineInput};

pub fn validate(
    input: &DeleteGoodsReceivedLineInput,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<GoodsReceivedLineRow, DeleteGoodsReceivedLineError> {
    // Check that the goods received line exists
    let existing_line = GoodsReceivedLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .ok_or(DeleteGoodsReceivedLineError::GoodsReceivedLineDoesNotExist)?;

    // Check that the goods received exists and is editable
    let goods_received = GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&existing_line.goods_received_id)?
        .ok_or(DeleteGoodsReceivedLineError::GoodsReceivedDoesNotExist)?;

    // Check that the goods received belongs to the current store
    if goods_received.store_id != store_id {
        return Err(DeleteGoodsReceivedLineError::CannotEditGoodsReceived);
    }

    // Check that the goods received is not finalised (cannot delete lines from finalised goods received)
    if goods_received.status == GoodsReceivedStatus::Finalised {
        return Err(DeleteGoodsReceivedLineError::CannotEditGoodsReceived);
    }

    Ok(existing_line)
}
