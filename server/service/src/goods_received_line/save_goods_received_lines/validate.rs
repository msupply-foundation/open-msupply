use repository::{goods_received_row::GoodsReceivedRowRepository, StorageConnection};

use crate::goods_received_line::save_goods_received_lines::SaveGoodsReceivedLinesError;

pub fn validate(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), SaveGoodsReceivedLinesError> {
    GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(SaveGoodsReceivedLinesError::GoodsReceivedDoesNotExist)?;
    Ok(())
}
