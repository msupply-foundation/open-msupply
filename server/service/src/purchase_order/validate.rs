use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
    StorageConnection,
};

pub(crate) fn purchase_order_lines_editable(purchase_order: &PurchaseOrderRow) -> bool {
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

// adjusted quantity is updated at all statuses except finalised
// even though the user can only update adjusted at CONFIRMED and SENT statuses
pub(crate) fn can_edit_adjusted_quantity(purchase_order: &PurchaseOrderRow) -> bool {
    match purchase_order.status {
        PurchaseOrderStatus::New
        | PurchaseOrderStatus::RequestApproval
        | PurchaseOrderStatus::Confirmed
        | PurchaseOrderStatus::Sent => true,
        PurchaseOrderStatus::Finalised => false,
    }
}

pub fn check_purchase_order_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
    PurchaseOrderRowRepository::new(connection).find_one_by_id(id)
}
