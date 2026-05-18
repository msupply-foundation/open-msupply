use repository::{
    RepositoryError, SyncMessageRow, SyncMessageRowRepository, SyncMessageRowType, TransactionError,
};

use crate::service_provider::ServiceContext;

mod validate;
use validate::validate;
mod generate;
use generate::generate;
mod test;

#[derive(PartialEq, Debug)]
pub enum InsertSyncMessageError {
    SyncMessageAlreadyExists,
    ToStoreDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertSyncMessageInput {
    pub id: String,
    pub to_store_id: Option<String>,
    pub body: Option<String>,
    pub r#type: SyncMessageRowType,
}

pub fn insert_sync_message(
    ctx: &ServiceContext,
    input: InsertSyncMessageInput,
) -> Result<SyncMessageRow, InsertSyncMessageError> {
    let sync_message = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;

            let from_store_id = &ctx.store_id;
            let sync_message = generate(input, from_store_id.to_string());

            SyncMessageRowRepository::new(connection).upsert_one(&sync_message)?;

            Ok(sync_message)
        })
        .map_err(|error: TransactionError<InsertSyncMessageError>| error.to_inner_error())?;

    Ok(sync_message)
}

impl From<RepositoryError> for InsertSyncMessageError {
    fn from(error: RepositoryError) -> Self {
        InsertSyncMessageError::DatabaseError(error)
    }
}
