use repository::{RepositoryError, StorageConnection, SyncBufferV7Repository, SyncBufferV7Row};

pub mod integrate;
pub mod prepare;
pub mod serde;
pub mod sync;
pub mod sync_logger;
pub mod validate;
pub mod validate_translate_integrate;

pub(crate) fn write_sync_buffer_error(
    row: SyncBufferV7Row,
    connection: &StorageConnection,
    error_message: &impl std::error::Error,
) -> Result<(), RepositoryError> {
    let repo = SyncBufferV7Repository::new(connection);
    repo.upsert(&SyncBufferV7Row {
        integration_error: Some(error_message.to_string()),
        integration_datetime: Some(chrono::Utc::now().naive_utc()),
        ..row
    })?;
    Ok(())
}

pub(crate) fn write_sync_buffer_success(
    row: SyncBufferV7Row,
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    let repo = SyncBufferV7Repository::new(connection);
    repo.upsert(&SyncBufferV7Row {
        integration_error: None,
        integration_datetime: Some(chrono::Utc::now().naive_utc()),
        ..row
    })?;
    Ok(())
}
