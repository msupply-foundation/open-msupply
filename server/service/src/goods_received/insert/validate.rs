use super::{InsertGoodsReceivedError, InsertGoodsReceivedInput};
use repository::{
    goods_received_row::GoodsReceivedRowRepository, PurchaseOrderRowRepository, StorageConnection,
};

pub fn validate(
    input: &InsertGoodsReceivedInput,
    _store_id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertGoodsReceivedError> {
    // Check if goods received with this ID already exists
    if GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertGoodsReceivedError::GoodsReceivedAlreadyExists);
    }

    // Check if the referenced purchase order exists
    if PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedError::PurchaseOrderDoesNotExist);
    }

    Ok(())
}
