use repository::{
    EqualFilter, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, PurchaseOrder,
    PurchaseOrderFilter, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineRepository,
    PurchaseOrderRepository, PurchaseOrderStatus, RepositoryError, StorageConnection,
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
    user_has_auth_permission: Option<bool>,
) -> Result<(PurchaseOrder, Option<PurchaseOrderStatus>), UpdatePurchaseOrderError> {
    let purchase_order = PurchaseOrderRepository::new(connection)
        .query_by_filter(PurchaseOrderFilter::new().id(EqualFilter::equal_to(input.id.to_string())))?
        .pop()
        .ok_or(UpdatePurchaseOrderError::PurchaseOrderDoesNotExist)?;

    // Check auth is required before changing to Request Approval
    if input.status == Some(PurchaseOrderStatus::RequestApproval) {
        let requires_auth = check_requires_auth(connection, store_id)?;
        if !requires_auth {
            // If no authorisation required, return status Confirmed
            return Ok((purchase_order, Some(PurchaseOrderStatus::Confirmed)));
        }
    }

    // Check user has permission to authorise purchase order, if authorisation is required
    if input.status == Some(PurchaseOrderStatus::Confirmed) {
        let requires_auth = check_requires_auth(connection, store_id)?;
        if requires_auth && user_has_auth_permission != Some(true) {
            return Err(UpdatePurchaseOrderError::UserUnableToAuthorisePurchaseOrder);
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
        PurchaseOrderLineFilter::new()
            .purchase_order_id(EqualFilter::equal_to(purchase_order.purchase_order_row.id.to_string())),
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

    Ok((purchase_order, None))
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

fn check_requires_auth(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    AuthorisePurchaseOrder
        .load(connection, Some(store_id.to_string()))
        .map_err(|_| RepositoryError::NotFound)
}
