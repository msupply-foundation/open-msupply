use repository::{message_row::MessageRowRepository, RepositoryError, StorageConnection};

pub fn check_message_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    Ok(!MessageRowRepository::new(connection).check_exists_by_id(id)?)
}

pub fn check_body_not_empty(body: &str) -> bool {
    !body.trim().is_empty()
}
