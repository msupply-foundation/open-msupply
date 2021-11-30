use repository::StorageConnection;

use crate::{current_store_id, WithDBError};

pub struct RecordDoesNotBelongToCurrentStore;

pub fn check_record_belongs_to_current_store(
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(), WithDBError<RecordDoesNotBelongToCurrentStore>> {
    if store_id == &current_store_id(connection)? {
        Ok(())
    } else {
        Err(WithDBError::Error(RecordDoesNotBelongToCurrentStore))
    }
}
