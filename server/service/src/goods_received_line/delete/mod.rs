use repository::{goods_received_line_row::GoodsReceivedLineRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum DeleteGoodsReceivedLineError {
    GoodsReceivedLineDoesNotExist,
    GoodsReceivedDoesNotExist,
    CannotEditGoodsReceived,
    DatabaseError(RepositoryError),
}

pub fn delete_goods_received_line(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteGoodsReceivedLineError> {
    let goods_received_line_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, connection)?;
            match GoodsReceivedLineRowRepository::new(connection).delete(&id) {
                Ok(_) => Ok(id),
                Err(err) => Err(DeleteGoodsReceivedLineError::from(err)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(goods_received_line_id)
}

impl From<RepositoryError> for DeleteGoodsReceivedLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteGoodsReceivedLineError::DatabaseError(error)
    }
}
