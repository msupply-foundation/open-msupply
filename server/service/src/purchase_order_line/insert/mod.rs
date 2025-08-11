use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::{
    ActivityLogType, PurchaseOrderLineRow, PurchaseOrderLineRowRepository, RepositoryError,
    TransactionError,
};

mod generate;
use generate::generate;
mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum InsertPurchaseOrderLineError {
    PurchaseOrderLineAlreadyExists,
    ItemDoesNotExist,
    PurchaseOrderDoesNotExist,
    IncorrectStoreId,
    CannotEditPurchaseOrder,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderLineInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
}

pub fn insert_purchase_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            validate(store_id, &input, connection)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::PurchaseOrderLineCreated,
                Some(input.id.clone()),
                None,
                None,
            )?;

            let new_purchase_order_line = generate(connection, store_id, input.clone())?;
            activity_log_entry(
                &ctx,
                ActivityLogType::PurchaseOrderLineCreated,
                Some(new_purchase_order_line.purchase_order_id.clone()),
                None,
                None,
            )?;
            PurchaseOrderLineRowRepository::new(connection).upsert_one(&new_purchase_order_line)?;

            Ok(new_purchase_order_line)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderLineError>| error.to_inner_error())?;

    Ok(purchase_order_line)
}

impl From<RepositoryError> for InsertPurchaseOrderLineError {
    fn from(error: RepositoryError) -> Self {
        InsertPurchaseOrderLineError::DatabaseError(error)
    }
}
