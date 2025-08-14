use repository::{
    goods_received_line_row::{GoodsReceivedLineRowRepository},
    TransactionError,
};

use crate::service_provider::ServiceContext;

mod validate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum DeleteGoodsReceivedLineError {
    GoodsReceivedLineDoesNotExist,
    GoodsReceivedDoesNotExist,
    CannotEditGoodsReceived,
    DatabaseError(repository::RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct DeleteGoodsReceivedLineInput {
    pub id: String,
}

pub fn delete_goods_received_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: DeleteGoodsReceivedLineInput,
) -> Result<String, DeleteGoodsReceivedLineError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let existing_line = validate(&input, store_id, connection)?;
            
            GoodsReceivedLineRowRepository::new(connection).delete(&existing_line.id)?;

            Ok(existing_line.id) as Result<String, DeleteGoodsReceivedLineError>
        })
        .map_err(|error: TransactionError<DeleteGoodsReceivedLineError>| error.to_inner_error())?;

    Ok(line_id)
}

impl From<repository::RepositoryError> for DeleteGoodsReceivedLineError {
    fn from(error: repository::RepositoryError) -> Self {
        DeleteGoodsReceivedLineError::DatabaseError(error)
    }
}
