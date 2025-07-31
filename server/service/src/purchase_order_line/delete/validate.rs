use repository::{PurchaseOrderLineRowRepository, PurchaseOrderRowRepository, StorageConnection};

use crate::{
    purchase_order::validate::purchase_order_is_editable,
    purchase_order_line::delete::DeletePurchaseOrderLineError,
};

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeletePurchaseOrderLineError> {
    let purchase_order_line = PurchaseOrderLineRowRepository::new(connection).find_one_by_id(id)?;
    let purchase_order_line = match purchase_order_line {
        Some(line) => line,
        None => return Err(DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist),
    };

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&purchase_order_line.purchase_order_id)?;
    let purchase_order = match purchase_order {
        Some(po) => po,
        None => return Err(DeletePurchaseOrderLineError::PurchaseOrderDoesNotExist),
    };

    if !purchase_order_is_editable(&purchase_order) {
        return Err(DeletePurchaseOrderLineError::CannotEditPurchaseOrder);
    }

    Ok(())
}
