use super::DeletePurchaseOrderError;
use crate::purchase_order::validate::check_purchase_order_exists;
use repository::{PurchaseOrderRow, PurchaseOrderStatus, StorageConnection};

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

    // Only allow deletion of purchase orders with NEW status
    if purchase_order.status != PurchaseOrderStatus::New {
        return Err(CannotDeleteNonNewPurchaseOrder);
    }

    Ok(purchase_order)
}
