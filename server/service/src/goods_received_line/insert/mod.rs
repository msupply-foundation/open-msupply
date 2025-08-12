use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineRowRepository},
    RepositoryError, TransactionError,
};

use crate::service_provider::ServiceContext;

mod generate;
use generate::generate;
mod validate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum InsertGoodsReceivedLineError {
    GoodsReceivedDoesNotExist,
    GoodsReceivedLineAlreadyExists,
    DatabaseError(RepositoryError),
    CannotEditGoodsReceived,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertGoodsReceivedLineInput {
    pub id: String,
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
}

pub fn insert_goods_received_line(
    ctx: &ServiceContext,
    input: InsertGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, InsertGoodsReceivedLineError> {
    let goods_received_line = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            let goods_received_line = generate(input.clone())?;
            GoodsReceivedLineRowRepository::new(connection).upsert_one(&goods_received_line)?;

            Ok(goods_received_line)
        })
        .map_err(|error: TransactionError<InsertGoodsReceivedLineError>| error.to_inner_error())?;

    Ok(goods_received_line)
}

impl From<RepositoryError> for InsertGoodsReceivedLineError {
    fn from(error: RepositoryError) -> Self {
        InsertGoodsReceivedLineError::DatabaseError(error)
    }
}
