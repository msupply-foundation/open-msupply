use repository::StorageConnection;

use crate::purchase_order::{
    delete::DeletePurchaseOrderError, validate::check_purchase_order_exists,
};

pub fn validate(
    id: &str,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(), DeletePurchaseOrderError> {
    let purchase_order_row = check_purchase_order_exists(id, connection)?
        .ok_or(DeletePurchaseOrderError::PurchaseOrderDoesNotExist)?;

    if purchase_order_row.store_id != store_id {
        return Err(DeletePurchaseOrderError::NotThisStorePurchaseOrder);
    }

    // TODO: Add more validation rules as needed
    // For now, we'll allow deletion regardless of status
    // In the future, you might want to add:
    // if !purchase_order_is_editable(&purchase_order_row) {
    //     return Err(DeletePurchaseOrderError::CannotEditPurchaseOrder);
    // }

    Ok(())
}
