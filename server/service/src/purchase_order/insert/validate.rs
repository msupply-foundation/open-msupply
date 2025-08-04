use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertPurchaseOrderError, InsertPurchaseOrderInput};
use repository::{PurchaseOrderRowRepository, StorageConnection};

pub fn validate(
    input: &InsertPurchaseOrderInput,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertPurchaseOrderError> {
    if PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertPurchaseOrderError::PurchaseOrderAlreadyExists);
    }

    check_other_party(
        connection,
        store_id,
        &input.supplier_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|error| match error {
        OtherPartyErrors::OtherPartyDoesNotExist => InsertPurchaseOrderError::SupplierDoesNotExist,
        OtherPartyErrors::TypeMismatched => InsertPurchaseOrderError::NotASupplier,
        _ => InsertPurchaseOrderError::SupplierDoesNotExist,
    })?;

    Ok(())
}
