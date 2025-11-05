use crate::purchase_order_line::insert::PackSizeCodeCombination;
use crate::{
    purchase_order::validate::{can_edit_adjusted_quantity, can_edit_requested_quantity},
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
    user_has_permission: Option<bool>,
) -> Result<PurchaseOrderLineRow, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line = PurchaseOrderLineRepository::new(connection)
        .query_by_filter(
            PurchaseOrderLineFilter::new().id(EqualFilter::equal_to(input.id.to_string())),
        )?
        .pop()
        .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderLineNotFound)?;
    let line = purchase_order_line.purchase_order_line_row.clone();

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&line.purchase_order_id)?
        .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderDoesNotExist)?;

    // Allow editing of the requested quantity
    // Check if the user is allowed to update the requested_number_of_units
    if let Some(requested_units) = input.requested_number_of_units {
        if requested_units != line.requested_number_of_units
            && !can_edit_requested_quantity(&purchase_order)
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotEditRequestedQuantity);
        }
    }
    // Allow editing of the adjusted quantity
    // Check if the user is allowed to update the adjusted_number_of_units
    if let Some(adjusted_units) = input.adjusted_number_of_units {
        if Some(adjusted_units) != line.adjusted_number_of_units
            && !can_edit_adjusted_quantity(&purchase_order, user_has_permission.unwrap_or(false))
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotEditAdjustedQuantity);
        }
    }

    // Adjusted units cannot be reduced below received units
    if let Some(adjusted_units) = input.adjusted_number_of_units {
        if Some(adjusted_units) != line.adjusted_number_of_units
            && adjusted_units < line.received_number_of_units
        {
            return Err(UpdatePurchaseOrderLineInputError::CannotEditQuantityBelowReceived);
        }
    }

    // Check the line status change before purchase_order_lines_editable
    // Should be able to update the line status only when the Purchase Order Sent
    if let Some(new_status) = input.status.clone() {
        // Only validate if the status is actually changing
        if new_status != line.status {
            let is_purchase_order_sent = purchase_order.status >= PurchaseOrderStatus::Sent;
            let is_valid_status_change = match new_status {
                PurchaseOrderLineStatus::New => !is_purchase_order_sent,
                _ => is_purchase_order_sent,
            };

            if !is_valid_status_change {
                return Err(UpdatePurchaseOrderLineInputError::CannotChangeStatus);
            }
        }
    }

    if line.status == PurchaseOrderLineStatus::Closed
        && input.status == Some(PurchaseOrderLineStatus::Closed)
    {
        return Err(UpdatePurchaseOrderLineInputError::CannotEditPurchaseOrderLine);
    }

    // check if pack size and item id combination already exists
    let existing_pack_item = PurchaseOrderLineRepository::new(connection).query(
        Pagination::all(),
        Some(
            PurchaseOrderLineFilter::new()
                .id(EqualFilter::not_equal_to(input.id.to_string()))
                .purchase_order_id(EqualFilter::equal_to(purchase_order.id.to_string()))
                .requested_pack_size(EqualFilter::equal_to(
                    input
                        .requested_pack_size
                        .unwrap_or(line.requested_pack_size),
                ))
                .item_id(EqualFilter::equal_to(
                    input
                        .item_id
                        .clone()
                        .unwrap_or(line.item_link_id.clone())
                        .to_owned(),
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

    Ok(line)
}
