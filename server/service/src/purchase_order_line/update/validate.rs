use crate::purchase_order_line::insert::PackSizeCodeCombination;
use crate::{
    purchase_order::validate::{
        can_edit_adjusted_quantity, can_edit_requested_quantity, purchase_order_lines_editable,
    },
    purchase_order_line::update::{
        UpdatePurchaseOrderLineInput, UpdatePurchaseOrderLineInputError,
    },
};
use repository::{
    EqualFilter, ItemRowRepository, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait,
    Pagination, PurchaseOrderLineFilter, PurchaseOrderLineRepository, PurchaseOrderLineRow,
    PurchaseOrderLineStatus, PurchaseOrderRowRepository, PurchaseOrderStatus, StorageConnection,
};

pub fn validate(
    input: &UpdatePurchaseOrderLineInput,
    connection: &StorageConnection,
) -> Result<PurchaseOrderLineRow, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line = PurchaseOrderLineRepository::new(connection)
        .query_by_filter(PurchaseOrderLineFilter::new().id(EqualFilter::equal_to(&input.id)))?
        .pop()
        .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderLineNotFound)?;
    let line = purchase_order_line.purchase_order_line_row.clone();

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&line.purchase_order_id)?
        .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderDoesNotExist)?;

    // Allow editing of the requested quantity
    // Check if the user is allowed to update the requested_number_of_units or just the adjusted_number_of_units
    if let Some(requested_units) = input.requested_number_of_units {
        if requested_units != line.requested_number_of_units
            && !can_edit_requested_quantity(&purchase_order)
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotEditRequestedQuantity);
        }
    }
    // Allow editing of the adjusted quantity
    // Check if the user is allowed to update the requested_number_of_units or just the adjusted_number_of_units
    if let Some(adjusted_units) = input.adjusted_number_of_units {
        if Some(adjusted_units) != line.adjusted_number_of_units
            && !can_edit_adjusted_quantity(&purchase_order)
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotEditAdjustedQuantity);
        }
    }

    if !purchase_order_lines_editable(&purchase_order) {
        return Err(UpdatePurchaseOrderLineInputError::CannotEditPurchaseOrder);
    }

    if line.status == PurchaseOrderLineStatus::Closed {
        return Err(UpdatePurchaseOrderLineInputError::CannotEditPurchaseOrderLine);
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
                        .unwrap_or(line.requested_pack_size),
                ))
                .item_id(EqualFilter::equal_to(
                    &input.item_id.clone().unwrap_or(line.item_link_id.clone()),
                )),
        ),
        None,
    )?;

    let item = ItemRowRepository::new(connection)
        .find_one_by_id(&input.item_id.clone().unwrap_or(line.item_link_id.clone()))?
        .ok_or(UpdatePurchaseOrderLineInputError::ItemDoesNotExist)?;

    let item_store = ItemStoreJoinRowRepository::new(connection)
        .find_one_by_item_and_store_id(&item.id, &purchase_order.store_id)?;
    if let Some(item_store_join) = item_store {
        if item_store_join.ignore_for_orders {
            return Err(UpdatePurchaseOrderLineInputError::ItemCannotBeOrdered(
                purchase_order_line,
            ));
        }
    }

    if !existing_pack_item.is_empty() {
        return Err(
            UpdatePurchaseOrderLineInputError::PackSizeCodeCombinationExists(
                PackSizeCodeCombination {
                    item_code: item.code.clone(),
                    requested_pack_size: input
                        .requested_pack_size
                        .unwrap_or(line.requested_pack_size),
                },
            ),
        );
    }

    if let Some(status) = input.status.clone() {
        let is_purchase_order_confirmed = purchase_order.status >= PurchaseOrderStatus::Confirmed;
        let is_valid_status_change = match (status, is_purchase_order_confirmed) {
            (PurchaseOrderLineStatus::New, false) => true,
            (PurchaseOrderLineStatus::New, true) => false,
            (_, true) => true,
            (_, false) => false,
        };

        if !is_valid_status_change {
            return Err(UpdatePurchaseOrderLineInputError::CannotChangeStatus);
        }
    }

    Ok(line)
}
