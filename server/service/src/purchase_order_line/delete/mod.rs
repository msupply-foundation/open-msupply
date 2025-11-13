use repository::{ActivityLogType, PurchaseOrderLineRowRepository, RepositoryError};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

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
            let purchase_order_line = validate(&id, connection)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::PurchaseOrderLineDeleted,
                Some(purchase_order_line.purchase_order_id),
                None,
                None,
                None,
            )?;

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
