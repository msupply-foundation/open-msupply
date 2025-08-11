use repository::{PurchaseOrderRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

mod test;
mod validate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum DeletePurchaseOrderError {
    PurchaseOrderDoesNotExist,
    NotThisStorePurchaseOrder,
    CannotEditPurchaseOrder,
    DatabaseError(RepositoryError),
    LineDeleteError {
        line_id: String,
        error: crate::purchase_order_line::delete::DeletePurchaseOrderLineError,
    },
}

pub fn delete_purchase_order(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeletePurchaseOrderError> {
    let purchase_order_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, &ctx.store_id, connection)?;

            // Delete all associated purchase order lines first
            let lines = crate::purchase_order_line::query::get_purchase_order_lines(
                ctx,
                Some(&ctx.store_id),
                None,
                Some(
                    repository::PurchaseOrderLineFilter::new()
                        .purchase_order_id(repository::EqualFilter::equal_to(&id)),
                ),
                None,
            )?
            .rows;

            for line in lines {
                crate::purchase_order_line::delete::delete_purchase_order_line(
                    ctx,
                    line.purchase_order_line_row.id.clone(),
                )
                .map_err(|error| DeletePurchaseOrderError::LineDeleteError {
                    line_id: line.purchase_order_line_row.id,
                    error,
                })?;
            }

            // TODO: Add activity log entry when available
            // activity_log_entry(
            //     ctx,
            //     ActivityLogType::PurchaseOrderDeleted,
            //     Some(id.to_owned()),
            //     None,
            //     None,
            // )?;

            match PurchaseOrderRowRepository::new(connection).delete(&id) {
                Ok(_) => Ok(id.clone()),
                Err(error) => Err(DeletePurchaseOrderError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(purchase_order_id)
}

impl From<RepositoryError> for DeletePurchaseOrderError {
    fn from(error: RepositoryError) -> Self {
        DeletePurchaseOrderError::DatabaseError(error)
    }
}

impl From<crate::ListError> for DeletePurchaseOrderError {
    fn from(error: crate::ListError) -> Self {
        match error {
            crate::ListError::DatabaseError(repository_error) => {
                DeletePurchaseOrderError::DatabaseError(repository_error)
            }
            _ => DeletePurchaseOrderError::DatabaseError(RepositoryError::as_db_error(
                &format!("List error: {:?}", error),
                None::<String>,
            )),
        }
    }
}
