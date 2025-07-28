use repository::{PurchaseOrderLineRowRepository, PurchaseOrderRowRepository, StorageConnection};

use crate::purchase_order_line::delete::DeletePurchaseOrderLineError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeletePurchaseOrderLineError> {
    let _purchase_order_line =
        PurchaseOrderLineRowRepository::new(connection).find_one_by_id(id)?;
    if _purchase_order_line.is_none() {
        return Err(DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist);
    }

    let purchase_order = PurchaseOrderRowRepository::new(connection).find_one_by_id(id)?;
    let purchase_order = match purchase_order {
        Some(po) => po,
        None => return Err(DeletePurchaseOrderLineError::PurchaseOrderDoesNotExist),
    };

    if !purchase_order.is_editable() {
        return Err(DeletePurchaseOrderLineError::CannotEditPurchaseOrder);
    }

    Ok(())
}
