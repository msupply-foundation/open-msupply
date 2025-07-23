use repository::{PurchaseOrderRow, PurchaseOrderRowRepository, RepositoryError, TransactionError};

use crate::service_provider::ServiceContext;

mod generate;
use generate::generate;
mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum InsertPurchaseOrderError {
    SupplierDoesNotExist,
    PurchaseOrderAlreadyExists,
    NotASupplier,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderInput {
    pub id: String,
    pub supplier_id: String,
}

pub fn insert_purchase_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertPurchaseOrderInput,
) -> Result<PurchaseOrderRow, InsertPurchaseOrderError> {
    let purchase_order = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, store_id, connection)?;

            let purchase_order = generate(connection, store_id, &ctx.user_id, input.clone())?;
            PurchaseOrderRowRepository::new(connection).upsert_one(&purchase_order)?;

            Ok(purchase_order)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderError>| error.to_inner_error())?;

    Ok(purchase_order)
}

impl From<RepositoryError> for InsertPurchaseOrderError {
    fn from(error: RepositoryError) -> Self {
        InsertPurchaseOrderError::DatabaseError(error)
    }
}
