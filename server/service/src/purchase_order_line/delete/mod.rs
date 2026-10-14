use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::{
    ActivityLogType, NumberRowRepository, NumberRowType, PurchaseOrderLineRow,
    PurchaseOrderLineRowRepository, RepositoryError, StorageConnection,
};

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
        .transaction_sync(
            |connection| -> Result<String, DeletePurchaseOrderLineError> {
                let purchase_order_line = validate(&id, connection)?;

                activity_log_entry(
                    ctx,
                    ActivityLogType::PurchaseOrderLineDeleted,
                    Some(purchase_order_line.purchase_order_id.clone()),
                    None,
                    None,
                )?;

                PurchaseOrderLineRowRepository::new(connection).delete(&id)?;
                renumber_lines(connection, &ctx.store_id, &purchase_order_line)?;

                Ok(id)
            },
        )
        .map_err(|error| error.to_inner_error())?;
    Ok(purchase_order_line_id)
}

fn renumber_lines(
    connection: &StorageConnection,
    store_id: &str,
    deleted: &PurchaseOrderLineRow,
) -> Result<(), RepositoryError> {
    let line_repo = PurchaseOrderLineRowRepository::new(connection);
    let lines = line_repo
        .find_many_by_purchase_order_ids(std::slice::from_ref(&deleted.purchase_order_id))?;

    for mut line in lines
        .into_iter()
        .filter(|line| line.line_number > deleted.line_number)
    {
        line.line_number -= 1;
        line_repo.upsert_one(&line)?;
    }

    // Drop the counter so the next insert resumes from the highest remaining line number
    let number_repo = NumberRowRepository::new(connection);
    let number_type = NumberRowType::PurchaseOrderLine(deleted.purchase_order_id.clone());
    if let Some(number_row) = number_repo.find_one_by_type_and_store(&number_type, store_id)? {
        number_repo.delete(&number_row.id)?;
    }

    Ok(())
}

impl From<RepositoryError> for DeletePurchaseOrderLineError {
    fn from(error: RepositoryError) -> Self {
        DeletePurchaseOrderLineError::DatabaseError(error)
    }
}
