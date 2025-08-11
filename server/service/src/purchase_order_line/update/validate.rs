use repository::{
    PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::{
    purchase_order::validate::{can_adjust_requested_quantity, purchase_order_is_editable},
    purchase_order_line::update::{
        UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError,
    },
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

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&purchase_order_line.purchase_order_id)?;
    let purchase_order = match purchase_order {
        Some(purchase_order) => purchase_order,
        None => return Err(UpdatePurchaseOrderLineInputError::PurchaseOrderDoesNotExist),
    };

    if !purchase_order_is_editable(&purchase_order) {
        return Err(UpdatePurchaseOrderLineInputError::CannotEditPurchaseOrder);
    }

    // Check if the user is allowed to update the requested_number_of_units or just the adjusted_number_of_units
    match input.requested_number_of_units {
        Some(requested_units) => {
            if requested_units != purchase_order_line.requested_number_of_units
                && !can_adjust_requested_quantity(&purchase_order)
            {
                return Err(UpdatePurchaseOrderLineInputError::CannotAdjustRequestedQuantity);
            }
        }
        None => {} // Nothing to check :)
    }

    Ok(purchase_order_line)
}
