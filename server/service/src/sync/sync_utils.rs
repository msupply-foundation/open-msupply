use repository::{NameLinkRowRepository, RepositoryError, StorageConnection};

pub fn map_optional_name_link_id_to_name_id(
    connection: &StorageConnection,
    name_link_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let name_link_id = match name_link_id {
        Some(id) => id,
        None => return Ok(None),
    };
    match map_name_link_id_to_name_id(connection, name_link_id) {
        Ok(name_id) => Ok(Some(name_id)),
        Err(e) => Err(e),
    }
}

pub fn map_name_link_id_to_name_id(
    connection: &StorageConnection,
    name_link_id: String,
) -> Result<String, RepositoryError> {
    let repository = NameLinkRowRepository::new(connection);
    let name_row = repository.find_one_by_id(&name_link_id)?;

    let name_id = name_row
        .map(|row| row.name_id)
        .ok_or_else(|| RepositoryError::NotFound)?;
    Ok(name_id)
}
