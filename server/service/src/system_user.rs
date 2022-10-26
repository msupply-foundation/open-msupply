use repository::{RepositoryError, UserAccountRow, UserAccountRowRepository};
use util::constants::SYSTEM_USER_ID;

use crate::service_provider::ServiceProvider;

pub fn create_system_user(service_provider: &ServiceProvider) -> Result<(), RepositoryError> {
    let system_user = UserAccountRow {
        id: SYSTEM_USER_ID.to_string(),
        username: SYSTEM_USER_ID.to_string(),
        hashed_password: "".to_string(),
        email: None,
        language: "en".to_string(),
    };

    let connection = service_provider.connection()?;
    let user_repository = UserAccountRowRepository::new(&connection);
    let user = user_repository.find_one_by_id(&system_user.id)?;
    if user.is_none() {
        user_repository.insert_one(&system_user)?;
    };

    Ok(())
}
