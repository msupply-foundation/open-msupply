use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::{
    goods_received_row::GoodsReceivedRowRepository, ActivityLogType, RepositoryError,
};

pub mod validate;
use validate::validate;

#[derive(Debug, PartialEq, Clone)]
pub enum DeleteGoodsReceivedError {
    GoodsReceivedDoesNotExist,
    NotThisStoreGoodsReceived,
    CannotEditFinalised,
    // LineDeleteError {
    //     line_id: String,
    //     error: DeleteGoodsReceivedLineError,
    // },
    DatabaseError(RepositoryError),
}

pub fn delete_goods_received(
    ctx: &ServiceContext,
    id: &str,
) -> Result<String, DeleteGoodsReceivedError> {
    let goods_received_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(id, &ctx.store_id, connection)?;

            // TODO: PIWAKAWAKA - deletion of lines

            activity_log_entry(
                ctx,
                ActivityLogType::GoodsReceivedDeleted,
                Some(id.to_string()),
                None,
                None,
            )?;

            match GoodsReceivedRowRepository::new(connection).delete(id) {
                Ok(_) => Ok(id.to_string()),
                Err(error) => Err(DeleteGoodsReceivedError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(goods_received_id)
}

impl From<RepositoryError> for DeleteGoodsReceivedError {
    fn from(error: RepositoryError) -> Self {
        DeleteGoodsReceivedError::DatabaseError(error)
    }
}
