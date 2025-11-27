use repository::{PurchaseOrderRow, PurchaseOrderRowRepository, RepositoryError, TransactionError};

use crate::{
    activity_log::{activity_log_entry, log_type_from_purchase_order_status},
    service_provider::ServiceContext,
};

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
            let other_party = validate(&input, store_id, connection)?;

            let purchase_order = generate(
                connection,
                store_id,
                &ctx.user_id,
                input.clone(),
                other_party.currency_id,
            )?;
            PurchaseOrderRowRepository::new(connection).upsert_one(&purchase_order)?;

            activity_log_entry(
                ctx,
                log_type_from_purchase_order_status(&purchase_order.status),
                Some(purchase_order.id.to_string()),
                None,
                None,
            )?;

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
