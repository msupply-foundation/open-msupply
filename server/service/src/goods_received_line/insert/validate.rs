use super::{
    InsertGoodsReceivedLineError, InsertGoodsReceivedLineInput, InsertGoodsReceivedLinesError,
    InsertGoodsReceivedLinesFromPurchaseOrderInput,
};
use repository::{
    goods_received_line_row::GoodsReceivedLineRowRepository,
    goods_received_row::GoodsReceivedRowRepository,
    purchase_order_line_row::PurchaseOrderLineRowRepository,
    purchase_order_row::PurchaseOrderRowRepository, StorageConnection,
};

pub fn validate(
    input: &InsertGoodsReceivedLineInput,
    connection: &StorageConnection,
) -> Result<(), InsertGoodsReceivedLineError> {
    if GoodsReceivedLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertGoodsReceivedLineError::GoodsReceivedLineAlreadyExists);
    }

    if GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&input.goods_received_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedLineError::GoodsReceivedDoesNotExist);
    }

    if PurchaseOrderLineRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_line_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedLineError::PurchaseOrderLineDoesNotExist);
    }

    Ok(())
}

pub fn validate_references(
    input: &InsertGoodsReceivedLinesFromPurchaseOrderInput,
    connection: &StorageConnection,
) -> Result<(), InsertGoodsReceivedLinesError> {
    if GoodsReceivedRowRepository::new(connection)
        .find_one_by_id(&input.goods_received_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedLinesError::GoodsReceivedDoesNotExist);
    }

    if PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_id)?
        .is_none()
    {
        return Err(InsertGoodsReceivedLinesError::PurchaseOrderNotFound);
    }

    Ok(())
}
