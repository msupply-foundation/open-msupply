use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository},
    RepositoryError, TransactionError,
};

use crate::service_provider::ServiceContext;

mod generate;
use generate::generate;
mod validate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum InsertGoodsReceivedError {
    PurchaseOrderDoesNotExist,
    GoodsReceivedAlreadyExists,
    InternalError(String),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertGoodsReceivedInput {
    pub id: String,
    pub purchase_order_id: String,
}

pub fn insert_goods_received(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertGoodsReceivedInput,
) -> Result<GoodsReceivedRow, InsertGoodsReceivedError> {
    let goods_received = ctx
        .connection
        .transaction_sync(|connection| {
            let user = validate(&input, &ctx.user_id, connection)?;

            let goods_received = generate(connection, store_id, &user.username, input.clone())?;
            GoodsReceivedRowRepository::new(connection).upsert_one(&goods_received)?;

            Ok(goods_received)
        })
        .map_err(|error: TransactionError<InsertGoodsReceivedError>| error.to_inner_error())?;

    Ok(goods_received)
}

impl From<RepositoryError> for InsertGoodsReceivedError {
    fn from(error: RepositoryError) -> Self {
        InsertGoodsReceivedError::DatabaseError(error)
    }
}
