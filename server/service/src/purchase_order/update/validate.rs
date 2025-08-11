use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, StorageConnection,
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
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = PurchaseOrderRowRepository::new(connection).find_one_by_id(&input.id)?;
    let purchase_order = purchase_order.ok_or(UpdatePurchaseOrderError::UpdatedRecordNotFound)?;

    if input.status == Some(PurchaseOrderStatus::Authorised) {
        let is_authorised = AuthorisePurchaseOrder
            .load(connection, Some(store_id.to_string()))
            .map_err(|_| {
                UpdatePurchaseOrderError::DatabaseError(repository::RepositoryError::NotFound)
            })?;
        if !is_authorised {
            return Err(UpdatePurchaseOrderError::AuthorisationPreferenceNotSet);
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

    Ok(purchase_order)
}
