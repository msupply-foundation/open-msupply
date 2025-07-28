use repository::{
    ItemRowRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::purchase_order_line::insert::{
    InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput,
};

pub fn validate(
    store_id: &str,
    input: &InsertPurchaseOrderLineInput,
    connection: &StorageConnection,
) -> Result<(), InsertPurchaseOrderLineError> {
    if PurchaseOrderLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertPurchaseOrderLineError::PurchaseOrderLineAlreadyExists);
    }

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_id)?
        .ok_or(InsertPurchaseOrderLineError::PurchaseOrderDoesNotExist)?;

    if purchase_order.store_id != store_id {
        return Err(InsertPurchaseOrderLineError::IncorrectStoreId);
    }

    if !purchase_order.is_editable() {
        return Err(InsertPurchaseOrderLineError::PurchaseOrderCannotBeUpdated);
    }

    if ItemRowRepository::new(connection)
        .find_one_by_id(&input.item_id)?
        .is_none()
    {
        return Err(InsertPurchaseOrderLineError::ItemDoesNotExist);
    }

    Ok(())
}
