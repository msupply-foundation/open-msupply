use repository::{PurchaseOrderLineRowRepository, StorageConnection};

use crate::purchase_order_line::delete::DeletePurchaseOrderLineError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeletePurchaseOrderLineError> {
    PurchaseOrderLineRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist)
        .map(|_| ())
}
