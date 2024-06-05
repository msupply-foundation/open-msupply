use repository::{NameRow, NameRowRepository, RepositoryError, StorageConnection};

pub fn check_name_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<NameRow>, RepositoryError> {
    NameRowRepository::new(connection).find_one_by_id(id)
}
