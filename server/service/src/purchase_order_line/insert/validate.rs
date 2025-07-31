use repository::{
    EqualFilter, ItemRowRepository, Pagination, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

use crate::{
    purchase_order::validate::purchase_order_is_editable,
    purchase_order_line::insert::{InsertPurchaseOrderLineError, PackSizeCodeCombination},
};

pub struct ValidateInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
    pub requested_pack_size: f64,
}

pub fn validate(
    store_id: &str,
    input: &ValidateInput,
    connection: &StorageConnection,
) -> Result<(), InsertPurchaseOrderLineError> {
    if PurchaseOrderLineRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertPurchaseOrderLineError::PurchaseOrderLineAlreadyExists);
    }

    let purchase_order = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.purchase_order_id)?
        .ok_or(InsertPurchaseOrderLineError::PurchaseOrderDoesNotExist)?;

    if purchase_order.store_id != store_id {
        return Err(InsertPurchaseOrderLineError::IncorrectStoreId);
    }

    if !purchase_order_is_editable(&purchase_order) {
        return Err(InsertPurchaseOrderLineError::CannotEditPurchaseOrder);
    }

    // check if pack size and item id combination already exists
    let existing_pack_item = PurchaseOrderLineRepository::new(connection).query(
        Pagination::all(),
        Some(PurchaseOrderLineFilter {
            id: None,
            purchase_order_id: None,
            store_id: None,
            requested_pack_size: Some(EqualFilter {
                equal_to: Some(input.requested_pack_size),
                ..Default::default()
            }),
            item_id: Some(EqualFilter::equal_to(&input.item_id.clone())),
        }),
        None,
    )?;
    if !existing_pack_item.is_empty() {
        return Err(InsertPurchaseOrderLineError::PackSizeCodeCombinationExists(
            PackSizeCodeCombination {
                item_code: input.item_id.clone(),
                requested_pack_size: input.requested_pack_size,
            },
        ));
    }

    if ItemRowRepository::new(connection)
        .find_one_by_id(&input.item_id)?
        .is_none()
    {
        return Err(InsertPurchaseOrderLineError::ItemDoesNotExist);
    }

    Ok(())
}
