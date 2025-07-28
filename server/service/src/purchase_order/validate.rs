use repository::{PurchaseOrderRow, PurchaseOrderStatus};

pub(crate) fn purchase_order_is_editable(purchase_order: &PurchaseOrderRow) -> bool {
    match purchase_order.status {
        PurchaseOrderStatus::New
        | PurchaseOrderStatus::Authorised
        | PurchaseOrderStatus::Confirmed => true,
        PurchaseOrderStatus::Finalised => false,
    }
}
