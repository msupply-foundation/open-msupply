use repository::{StorageConnection, SyncMessageRowRepository};

use crate::{
    sync_message::insert::{InsertSyncMessageError, InsertSyncMessageInput},
    validate::check_store_exists,
};

pub fn validate(
    connection: &StorageConnection,
    input: &InsertSyncMessageInput,
) -> Result<(), InsertSyncMessageError> {
    if SyncMessageRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        return Err(InsertSyncMessageError::SyncMessageAlreadyExists);
    }

    if let Some(to_store_id) = &input.to_store_id {
        if !check_store_exists(connection, to_store_id)? {
            return Err(InsertSyncMessageError::ToStoreDoesNotExist);
        }
    }

    Ok(())
}
