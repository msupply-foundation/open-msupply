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

    // Only allow deletion of purchase orders with New or RequestApproval status
    if !matches!(
        purchase_order.status,
        PurchaseOrderStatus::New | PurchaseOrderStatus::RequestApproval
    ) {
        return Err(CannotDeletePurchaseOrder);
    }

    Ok(purchase_order)
}
