use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
    StorageConnection,
};
// TODO: Check the implementations of these functions ->
// purchase_order_is_editable = false should not block can_adjust_requested_quantity from being checked
pub(crate) fn purchase_order_is_editable(purchase_order: &PurchaseOrderRow) -> bool {
    match purchase_order.status {
        PurchaseOrderStatus::New | PurchaseOrderStatus::RequestApproval => true,
        PurchaseOrderStatus::Confirmed
        | PurchaseOrderStatus::Sent
        | PurchaseOrderStatus::Finalised => false,
    }
}

pub(crate) fn can_adjust_requested_quantity(purchase_order: &PurchaseOrderRow) -> bool {
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
