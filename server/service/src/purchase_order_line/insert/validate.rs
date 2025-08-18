use crate::{
    purchase_order::validate::purchase_order_is_editable,
    purchase_order_line::insert::{InsertPurchaseOrderLineError, PackSizeCodeCombination},
};
use repository::{
    EqualFilter, ItemRow, ItemRowRepository, Pagination, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

pub struct ValidateInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: Option<String>,
    pub item_code: Option<String>,
    pub requested_pack_size: f64,
}

pub fn validate(
    store_id: &str,
    input: &ValidateInput,
    connection: &StorageConnection,
) -> Result<ItemRow, InsertPurchaseOrderLineError> {
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

    let item_repo = ItemRowRepository::new(connection);
    let item = match (&input.item_code, &input.item_id) {
        (Some(item_code), _) => item_repo
            .find_one_by_code(item_code)?
            .ok_or_else(|| InsertPurchaseOrderLineError::CannotFindItemByCode(item_code.clone()))?,
        (None, Some(item_id)) => item_repo
            .find_one_by_id(item_id)?
            .ok_or(InsertPurchaseOrderLineError::ItemDoesNotExist)?,
        (None, None) => return Err(InsertPurchaseOrderLineError::ItemDoesNotExist),
    };

    // check if pack size and item id combination already exists
    let existing_pack_item = PurchaseOrderLineRepository::new(connection).query(
        Pagination::all(),
        Some(PurchaseOrderLineFilter {
            id: None,
            purchase_order_id: Some(EqualFilter::equal_to(&input.purchase_order_id)),
            store_id: None,
            requested_pack_size: Some(EqualFilter::equal_to_f64(input.requested_pack_size)),
            item_id: Some(EqualFilter::equal_to(&item.id)),
        }),
        None,
    )?;
    if !existing_pack_item.is_empty() {
        return Err(InsertPurchaseOrderLineError::PackSizeCodeCombinationExists(
            PackSizeCodeCombination {
                item_code: item.code.clone(),
                requested_pack_size: input.requested_pack_size,
            },
        ));
    }

    Ok(item)
}
