use std::collections::BTreeSet;

use crate::{
    activity_log::activity_log_entry,
    purchase_order_line::log::{item_code, line_log_detail},
    service_provider::ServiceContext,
};
use repository::{
    ActivityLogType, NumberRowRepository, NumberRowType, PurchaseOrderLineRowRepository,
    RepositoryError, StorageConnection,
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

pub type DeletePurchaseOrderLineOutcome = (String, Result<String, DeletePurchaseOrderLineError>);

pub fn delete_purchase_order_line(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeletePurchaseOrderLineError> {
    delete_purchase_order_lines(ctx, vec![id])?
        .pop()
        .map(|(_, outcome)| outcome)
        .unwrap_or(Err(
            DeletePurchaseOrderLineError::PurchaseOrderLineDoesNotExist,
        ))
}

/// Deletes every line it can in one transaction and renumbers each order once.
pub fn delete_purchase_order_lines(
    ctx: &ServiceContext,
    ids: Vec<String>,
) -> Result<Vec<DeletePurchaseOrderLineOutcome>, RepositoryError> {
    ctx.connection
        .transaction_sync(
            |connection| -> Result<Vec<DeletePurchaseOrderLineOutcome>, RepositoryError> {
                let line_repo = PurchaseOrderLineRowRepository::new(connection);
                let mut purchase_order_ids = BTreeSet::new();
                let mut outcomes = Vec::with_capacity(ids.len());

                for id in ids {
                    let outcome = match validate(&id, connection) {
                        Ok(line) => {
                            activity_log_entry(
                                ctx,
                                ActivityLogType::PurchaseOrderLineDeleted,
                                Some(line.purchase_order_id.clone()),
                                Some(
                                    serde_json::to_string(&line_log_detail(
                                        connection,
                                        &line,
                                        item_code(connection, &line.item_id)?,
                                    )?)
                                    .unwrap_or_default(),
                                ),
                                None,
                            )?;
                            line_repo.delete(&id)?;
                            purchase_order_ids.insert(line.purchase_order_id);
                            Ok(id.clone())
                        }
                        Err(DeletePurchaseOrderLineError::DatabaseError(error)) => {
                            return Err(error);
                        }
                        Err(error) => Err(error),
                    };
                    outcomes.push((id, outcome));
                }

                for purchase_order_id in purchase_order_ids {
                    renumber_lines(connection, &ctx.store_id, &purchase_order_id)?;
                }

                Ok(outcomes)
            },
        )
        .map_err(|error| error.to_inner_error())
}

fn renumber_lines(
    connection: &StorageConnection,
    store_id: &str,
    purchase_order_id: &str,
) -> Result<(), RepositoryError> {
    let line_repo = PurchaseOrderLineRowRepository::new(connection);
    let mut lines = line_repo.find_many_by_purchase_order_ids(&[purchase_order_id.to_string()])?;
    lines.sort_by_key(|line| line.line_number);

    for (index, mut line) in lines.into_iter().enumerate() {
        let line_number = index as i64 + 1;
        if line.line_number != line_number {
            line.line_number = line_number;
            line_repo.upsert_one(&line)?;
        }
    }

    // Drop the counter so the next insert resumes from the highest remaining line number
    let number_repo = NumberRowRepository::new(connection);
    let number_type = NumberRowType::PurchaseOrderLine(purchase_order_id.to_string());
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
