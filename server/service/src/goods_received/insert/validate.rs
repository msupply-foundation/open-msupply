use super::{InsertGoodsReceivedError, InsertGoodsReceivedInput};
use crate::goods_received::common::check_goods_received_exists;
use repository::{PurchaseOrderRowRepository, StorageConnection};

pub fn validate(
    input: &InsertGoodsReceivedInput,
    _store_id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertGoodsReceivedError> {
    if check_goods_received_exists(&input.id, connection)?.is_some() {
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
