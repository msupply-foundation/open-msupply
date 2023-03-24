use repository::{AuthoriserRow, AuthoriserRowRepository, RepositoryError, StorageConnection};

pub fn get_authorisers(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<Vec<AuthoriserRow>, RepositoryError> {
    let authorisers = AuthoriserRowRepository::new(&connection)
        .find_many_by_user_id(user_id)
        .unwrap_or_default();

    Ok(authorisers)
}
