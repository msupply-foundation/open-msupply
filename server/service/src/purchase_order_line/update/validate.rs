use repository::PurchaseOrderLineRow;
use repository::{
    EqualFilter, ItemRowRepository, Pagination, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::purchase_order_line::insert::PackSizeCodeCombination;
use crate::{
    purchase_order::validate::purchase_order_is_editable,
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
        Some(PurchaseOrderLineFilter {
            // don't include the existing line in the check
            id: Some(EqualFilter::not_equal_to(&input.id)),
            purchase_order_id: Some(EqualFilter::equal_to(&purchase_order.id)),
            store_id: None,
            requested_pack_size: Some(EqualFilter::equal_to_f64(
                input
                    .requested_pack_size
                    .unwrap_or(purchase_order_line.requested_pack_size),
            )),
            item_id: Some(EqualFilter::equal_to(
                &input
                    .item_id
                    .clone()
                    .unwrap_or(purchase_order_line.item_link_id.clone()),
            )),
        }),
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

    Ok(purchase_order_line)
}
