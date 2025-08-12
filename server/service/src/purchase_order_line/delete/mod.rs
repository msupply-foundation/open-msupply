use repository::{PurchaseOrderLineRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

mod test;
mod validate;
use validate::validate;

#[derive(PartialEq, Debug, Clone)]
pub enum DeletePurchaseOrderLineError {
    PurchaseOrderLineDoesNotExist,
    PurchaseOrderDoesNotExist,
    CannotEditPurchaseOrder,
    DatabaseError(RepositoryError),
}

pub fn delete_purchase_order_line(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeletePurchaseOrderLineError> {
    let purchase_order_line_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, connection)?;
            match PurchaseOrderLineRowRepository::new(connection).delete(&id) {
                Ok(_) => Ok(id),
                Err(err) => Err(DeletePurchaseOrderLineError::from(err)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(purchase_order_line_id)
}

impl From<RepositoryError> for DeletePurchaseOrderLineError {
    fn from(error: RepositoryError) -> Self {
        DeletePurchaseOrderLineError::DatabaseError(error)
    }
}
