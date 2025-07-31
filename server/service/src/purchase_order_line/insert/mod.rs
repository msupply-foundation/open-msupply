use crate::service_provider::ServiceContext;
use repository::{
    PurchaseOrderLineRow, PurchaseOrderLineRowRepository, RepositoryError, TransactionError,
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
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
}

pub fn insert_purchase_order_line(
    ctx: &ServiceContext,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&ctx.store_id.clone(), &input, connection)?;

            let new_purchase_order_line =
                generate(connection, &ctx.store_id.clone(), input.clone())?;
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
