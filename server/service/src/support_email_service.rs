use repository::{KeyType, KeyValueStoreRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub trait SupportEmailServiceTrait: Sync + Send {
    /// Loads the configured support email from the DB, None when unset
    /// (callers fall back to util::constants::SUPPORT_EMAIL)
    fn support_email(&self, ctx: &ServiceContext) -> Result<Option<String>, RepositoryError> {
        KeyValueStoreRepository::new(&ctx.connection).get_string(KeyType::SettingsSupportEmail)
    }

    /// Updates the configured support email; None (or an empty string) clears it
    fn update_support_email(
        &self,
        ctx: &ServiceContext,
        email: Option<String>,
    ) -> anyhow::Result<()> {
        let email = email.filter(|e| !e.trim().is_empty());

        if let Some(email) = &email {
            if !email.contains('@') {
                return Err(anyhow::anyhow!("Invalid email address: {email}"));
            }
        }

        KeyValueStoreRepository::new(&ctx.connection)
            .set_string(KeyType::SettingsSupportEmail, email)?;

        Ok(())
    }
}

pub struct SupportEmailService {}
impl SupportEmailServiceTrait for SupportEmailService {}
