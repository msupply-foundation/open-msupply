use super::DeletePurchaseOrderError;
use crate::purchase_order::validate::{check_purchase_order_exists, purchase_order_is_editable};
use repository::{PurchaseOrderRow, StorageConnection};

pub fn validate(
    id: &str,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<PurchaseOrderRow, DeletePurchaseOrderError> {
    use DeletePurchaseOrderError::*;

    let purchase_order =
        check_purchase_order_exists(id, connection)?.ok_or(PurchaseOrderDoesNotExist)?;

    if purchase_order.store_id != store_id {
        return Err(NotThisStorePurchaseOrder);
    }

    if !purchase_order_is_editable(&purchase_order) {
        return Err(CannotEditFinalised);
    }

    Ok(purchase_order)
}
