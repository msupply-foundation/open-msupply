use repository::{
    EqualFilter, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, PurchaseOrderLine,
    PurchaseOrderLineFilter, PurchaseOrderLineRepository, PurchaseOrderRow,
    PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError, StorageConnection,
};

use crate::{
    preference::{AuthorisePurchaseOrder, Preference},
    purchase_order::update::{UpdatePurchaseOrderError, UpdatePurchaseOrderInput},
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};

pub fn validate(
    input: &UpdatePurchaseOrderInput,
    store_id: &str,
    connection: &StorageConnection,
    user_has_permission: Option<bool>,
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = PurchaseOrderRowRepository::new(connection).find_one_by_id(&input.id)?;
    let purchase_order = purchase_order.ok_or(UpdatePurchaseOrderError::UpdatedRecordNotFound)?;

    // check user has permission to authorise purchase order, if authorisation is required
    if input.status == Some(PurchaseOrderStatus::Confirmed) {
        let requires_auth = AuthorisePurchaseOrder
            .load(connection, Some(store_id.to_string()))
            .map_err(|_| {
                UpdatePurchaseOrderError::DatabaseError(repository::RepositoryError::NotFound)
            })?;
        if requires_auth && user_has_permission != Some(true) {
            return Err(UpdatePurchaseOrderError::UserUnableToAuthorisePurchaseOrder);
            // TODO: update error message
        }
    }

    if let Some(supplier_id) = &input.supplier_id {
        check_other_party(
            connection,
            store_id,
            supplier_id,
            CheckOtherPartyType::Supplier,
        )
        .map_err(|error| match error {
            OtherPartyErrors::TypeMismatched => UpdatePurchaseOrderError::NotASupplier,
            OtherPartyErrors::OtherPartyDoesNotExist | OtherPartyErrors::OtherPartyNotVisible => {
                UpdatePurchaseOrderError::SupplierDoesNotExist
            }
            OtherPartyErrors::DatabaseError(e) => UpdatePurchaseOrderError::DatabaseError(e),
        })?;
    }

    if let Some(NullableUpdate {
        value: Some(donor_id),
    }) = &input.donor_id
    {
        check_other_party(connection, store_id, donor_id, CheckOtherPartyType::Donor)
            .map_err(|_| UpdatePurchaseOrderError::DonorDoesNotExist)?;
    }

    let purchase_order_lines = PurchaseOrderLineRepository::new(connection).query_by_filter(
        PurchaseOrderLineFilter::new().purchase_order_id(EqualFilter::equal_to(&purchase_order.id)),
    )?;

    // Only wanna check if status has been updated
    if input.status.is_some() {
        if let Some(non_orderable_items) =
            check_items_orderable(connection, store_id, purchase_order_lines)?
        {
            return Err(UpdatePurchaseOrderError::ItemsCannotBeOrdered(
                non_orderable_items,
            ));
        }
    }

    Ok(purchase_order)
}

fn check_items_orderable(
    connection: &StorageConnection,
    store_id: &str,
    purchase_order_lines: Vec<PurchaseOrderLine>,
) -> Result<Option<Vec<PurchaseOrderLine>>, RepositoryError> {
    let mut non_orderable_items = Vec::new();
    let item_store_join_repo = ItemStoreJoinRowRepository::new(connection);

    for line in purchase_order_lines {
        let item_link_id = &line.item_row.id;
        let item_store_join =
            item_store_join_repo.find_one_by_item_and_store_id(item_link_id, store_id)?;

        if let Some(item_store_join) = item_store_join {
            if item_store_join.ignore_for_orders {
                non_orderable_items.push(line.clone());
            }
        }
    }

    if !non_orderable_items.is_empty() {
        return Ok(Some(non_orderable_items));
    }
    Ok(None)
}
