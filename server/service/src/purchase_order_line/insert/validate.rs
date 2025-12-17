use crate::{
    purchase_order::validate::purchase_order_is_editable,
    purchase_order_line::insert::{
        InsertPurchaseOrderLineError, InsertPurchaseOrderLineInput, PackSizeCodeCombination,
    },
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use repository::{
    EqualFilter, ItemRow, ItemRowRepository, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, Pagination, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
    StorageConnection,
};

pub fn validate(
    store_id: &str,
    input: &InsertPurchaseOrderLineInput,
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

    let item = item_repo
        .find_one_by_id(&input.item_id_or_code)?
        .or_else(|| {
            item_repo
                .find_one_by_code(&input.item_id_or_code)
                .ok()
                .flatten()
        })
        .ok_or(InsertPurchaseOrderLineError::ItemDoesNotExist)?;

    let item_store = ItemStoreJoinRowRepository::new(connection)
        .find_one_by_item_and_store_id(&item.id, store_id)?;

    if let Some(item_store_join) = item_store {
        if item_store_join.ignore_for_orders {
            return Err(InsertPurchaseOrderLineError::ItemCannotBeOrdered);
        }
    }

    // check if pack size and item id combination already exists
    let existing_pack_item = PurchaseOrderLineRepository::new(connection).query(
        Pagination::all(),
        Some(
            PurchaseOrderLineFilter::new()
                .purchase_order_id(EqualFilter::equal_to(input.purchase_order_id.to_string()))
                .requested_pack_size(EqualFilter::equal_to(
                    input.requested_pack_size.unwrap_or_default(),
                ))
                .item_id(EqualFilter::equal_to(item.id.to_string())),
        ),
        None,
    )?;
    if !existing_pack_item.is_empty() {
        return Err(InsertPurchaseOrderLineError::PackSizeCodeCombinationExists(
            PackSizeCodeCombination {
                item_code: item.code.clone(),
                requested_pack_size: input.requested_pack_size.unwrap_or_default(),
            },
        ));
    }

    if let Some(manufacturer_id) = &input.manufacturer_id {
        check_other_party(
            connection,
            store_id,
            manufacturer_id,
            CheckOtherPartyType::Manufacturer,
        )
        .map_err(|e| match e {
            OtherPartyErrors::OtherPartyDoesNotExist => {
                InsertPurchaseOrderLineError::OtherPartyDoesNotExist {}
            }
            OtherPartyErrors::OtherPartyNotVisible => {
                InsertPurchaseOrderLineError::OtherPartyNotVisible
            }
            OtherPartyErrors::TypeMismatched => {
                InsertPurchaseOrderLineError::OtherPartyNotAManufacturer
            }
            OtherPartyErrors::DatabaseError(repository_error) => {
                InsertPurchaseOrderLineError::DatabaseError(repository_error)
            }
        })?;
    };

    Ok(item)
}
