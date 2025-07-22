use repository::{
    ItemRowRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::purchase_order_line::insert::{
    InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput,
};

pub fn validate(
    input: &InsertPurchaseOrderLineInput,
    connection: &StorageConnection,
) -> Result<(), InsertPurchaseOrderLineError> {
    if PurchaseOrderLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertPurchaseOrderLineError::PurchaseOrderLineAlreadyExists);
    }

    if PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_id)?
        .is_none()
    {
        return Err(InsertPurchaseOrderLineError::PurchaseOrderDoesNotExist);
    }

    if ItemRowRepository::new(connection)
        .find_one_by_id(&input.item_id)?
        .is_none()
    {
        return Err(InsertPurchaseOrderLineError::ItemDoesNotExist);
    }

    Ok(())
}
