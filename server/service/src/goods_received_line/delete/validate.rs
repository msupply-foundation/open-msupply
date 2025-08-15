use super::DeleteGoodsReceivedLineError;
use crate::goods_received_line::validate::goods_received_is_editable;
use repository::{
    goods_received_line_row::GoodsReceivedLineRowRepository,
    goods_received_row::GoodsReceivedRowRepository, StorageConnection,
};

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeleteGoodsReceivedLineError> {
    let goods_received_line = GoodsReceivedLineRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(DeleteGoodsReceivedLineError::GoodsReceivedLineDoesNotExist)?;

    let goods_received = GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&goods_received_line.goods_received_id)?
        .ok_or(DeleteGoodsReceivedLineError::GoodsReceivedDoesNotExist)?;

    if !goods_received_is_editable(&goods_received) {
        return Err(DeleteGoodsReceivedLineError::CannotEditGoodsReceived);
    }

    Ok(())
}
