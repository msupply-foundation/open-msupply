use chrono::NaiveDateTime;
use repository::{RepositoryError, UserAccountRowRepository};

use crate::service_provider::ServiceProvider;

pub struct SyncUser {}

impl SyncUser {
    pub fn get_latest_successful_user_sync(
        service_provider: &ServiceProvider,
        user_id: &str,
    ) -> Result<Option<NaiveDateTime>, RepositoryError> {
        let ctx: crate::service_provider::ServiceContext = service_provider.basic_context()?;

        let user = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(user_id)?
            .ok_or(RepositoryError::NotFound)?;

        Ok(user.last_successful_sync)
    }
}
