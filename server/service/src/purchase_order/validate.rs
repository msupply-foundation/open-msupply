use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
    StorageConnection,
};

pub(crate) fn purchase_order_is_editable(purchase_order: &PurchaseOrderRow) -> bool {
    match purchase_order.status {
        PurchaseOrderStatus::New | PurchaseOrderStatus::RequestApproval => true,
        PurchaseOrderStatus::Confirmed
        | PurchaseOrderStatus::Sent
        | PurchaseOrderStatus::Finalised => false,
    }
}

pub(crate) fn can_edit_requested_quantity(purchase_order: &PurchaseOrderRow) -> bool {
    match purchase_order.status {
        PurchaseOrderStatus::New | PurchaseOrderStatus::RequestApproval => true,
        PurchaseOrderStatus::Confirmed
        | PurchaseOrderStatus::Sent
        | PurchaseOrderStatus::Finalised => false,
    }
}

pub(crate) fn can_edit_adjusted_quantity(
    purchase_order: &PurchaseOrderRow,
    user_has_permission: bool,
) -> bool {
    if user_has_permission {
        // User can only update ADJUSTED QUANTITY field at CONFIRMED and SENT statuses and requires permissions
        match purchase_order.status {
            PurchaseOrderStatus::New
            | PurchaseOrderStatus::RequestApproval
            | PurchaseOrderStatus::Confirmed
            | PurchaseOrderStatus::Sent => true,
            PurchaseOrderStatus::Finalised => false,
        }
    } else {
        // Adjusted quantity is updated from REQUESTED QUANTITY in New and Request Approval statuses
        // All users need to be able to update it in these statuses
        match purchase_order.status {
            PurchaseOrderStatus::New | PurchaseOrderStatus::RequestApproval => true,
            PurchaseOrderStatus::Confirmed
            | PurchaseOrderStatus::Sent
            | PurchaseOrderStatus::Finalised => false,
        }
    }
}

pub fn check_purchase_order_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
    PurchaseOrderRowRepository::new(connection).find_one_by_id(id)
}
