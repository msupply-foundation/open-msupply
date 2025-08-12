use super::{InsertGoodsReceivedLineError, InsertGoodsReceivedLineInput};
use repository::{
    goods_received_line_row::GoodsReceivedLineRowRepository,
    goods_received_row::GoodsReceivedRowRepository, StorageConnection,
};

pub fn validate(
    input: &InsertGoodsReceivedLineInput,
    connection: &StorageConnection,
) -> Result<(), InsertGoodsReceivedLineError> {
    // Check if goods received with this ID already exists
    if GoodsReceivedLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertGoodsReceivedLineError::GoodsReceivedLineAlreadyExists);
    }

    // Check if the referenced goods received exists
    if GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&input.goods_received_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedLineError::GoodsReceivedDoesNotExist);
    }

    Ok(())
}
