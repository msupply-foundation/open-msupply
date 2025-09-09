use repository::PurchaseOrderLineRow;
use repository::{
    EqualFilter, ItemRowRepository, Pagination, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::purchase_order_line::insert::PackSizeCodeCombination;
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

    // check if pack size and item id combination already exists
    let existing_pack_item = PurchaseOrderLineRepository::new(connection).query(
        Pagination::all(),
        Some(
            PurchaseOrderLineFilter::new()
                .id(EqualFilter::not_equal_to(&input.id))
                .purchase_order_id(EqualFilter::equal_to(&purchase_order.id))
                .requested_pack_size(EqualFilter::equal_to_f64(
                    input
                        .requested_pack_size
                        .unwrap_or(purchase_order_line.requested_pack_size),
                ))
                .item_id(EqualFilter::equal_to(
                    &input
                        .item_id
                        .clone()
                        .unwrap_or(purchase_order_line.item_link_id.clone()),
                )),
        ),
        None,
    )?;

    let item = ItemRowRepository::new(connection)
        .find_one_by_id(
            &input
                .item_id
                .clone()
                .unwrap_or(purchase_order_line.item_link_id.clone()),
        )?
        .ok_or(UpdatePurchaseOrderLineInputError::ItemDoesNotExist)?;

    if !existing_pack_item.is_empty() {
        return Err(
            UpdatePurchaseOrderLineInputError::PackSizeCodeCombinationExists(
                PackSizeCodeCombination {
                    item_code: item.code.clone(),
                    requested_pack_size: input
                        .requested_pack_size
                        .unwrap_or(purchase_order_line.requested_pack_size),
                },
            ),
        );
    }

    // Check if the user is allowed to update the requested_number_of_units or just the adjusted_number_of_units
    if let Some(requested_units) = input.requested_number_of_units {
        if requested_units != purchase_order_line.requested_number_of_units
            && !can_adjust_requested_quantity(&purchase_order)
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotAdjustRequestedQuantity);
        }
    }

    Ok(purchase_order_line)
}
