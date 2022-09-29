use repository::{RepositoryError, StorageConnection, UserAccountRow, UserAccountRowRepository};
use util::uuid::uuid;

pub fn system_user(connection: &StorageConnection) -> Result<UserAccountRow, RepositoryError> {
    let system_user = UserAccountRow {
        id: uuid(),
        username: "System".to_string(),
        hashed_password: "".to_string(),
        email: None,
    };

    let user_repository = UserAccountRowRepository::new(connection);
    match user_repository.find_one_by_user_name(&system_user.username)? {
        Some(user) => Ok(user),
        None => {
            user_repository.insert_one(&system_user)?;
            Ok(system_user)
        }
    }
}
