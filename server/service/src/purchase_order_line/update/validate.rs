use repository::{PurchaseOrderLineRow, PurchaseOrderLineRowRepository, StorageConnection};

use crate::purchase_order_line::update::{
    UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError,
};

pub fn validate(
    input: &UpdatePurchaseOrderLineInput,
    connection: &StorageConnection,
) -> Result<PurchaseOrderLineRow, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line =
        PurchaseOrderLineRowRepository::new(connection).find_one_by_id(&input.id)?;

    let purchase_order_line = match purchase_order_line {
        Some(purchase_order_line) => purchase_order_line,
        None => return Err(UpdatePurchaseOrderLineInputError::PurchaseOrderLineNotFound),
    };

    Ok(purchase_order_line)
}
