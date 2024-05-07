use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use reqwest::Url;
use thiserror::Error;

use crate::{service_provider::ServiceContext, sync::settings::SyncSettings};

#[derive(Debug, Error)]
pub enum UpdateSettingsError {
    #[error(transparent)]
    RepositoryError(RepositoryError),
    #[error("Invalid settings: {0}")]
    InvalidSettings(String),
}

fn validate(settings: &SyncSettings) -> Result<(), UpdateSettingsError> {
    if let Err(err) = Url::parse(&settings.url) {
        return Err(UpdateSettingsError::InvalidSettings(format!(
            "Invalid url: {:?}",
            err
        )));
    }

    if settings.username == "" {
        return Err(UpdateSettingsError::InvalidSettings(
            "Empty username not allowed".to_string(),
        ));
    }

    Ok(())
}

pub trait SettingsServiceTrait: Sync + Send {
    /// Loads sync settings from the DB
    fn sync_settings(&self, ctx: &ServiceContext) -> Result<Option<SyncSettings>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let url = key_value_store.get_string(KeyType::SettingsSyncUrl)?;
        let username = key_value_store.get_string(KeyType::SettingsSyncUsername)?;
        let password_sha256 = key_value_store.get_string(KeyType::SettingsSyncPasswordSha256)?;
        let interval_seconds = key_value_store.get_i64(KeyType::SettingsSyncIntervalSeconds)?;

        // `?` inside this closure would result in closure returning `None`
        let make_settings = || {
            Some(SyncSettings {
                url: url?,
                username: username?,
                password_sha256: password_sha256?,
                interval_seconds: interval_seconds? as u64,
                batch_size: Default::default(),
            })
        };

        Ok(make_settings())
    }

    fn update_sync_settings(
        &self,
        ctx: &ServiceContext,
        settings: &SyncSettings,
    ) -> Result<(), UpdateSettingsError> {
        validate(settings)?;

        let result = ctx
            .connection
            .transaction_sync(|con| {
                let key_value_store = KeyValueStoreRepository::new(con);
                key_value_store.set_string(KeyType::SettingsSyncUrl, Some(settings.url.clone()))?;
                key_value_store.set_string(
                    KeyType::SettingsSyncUsername,
                    Some(settings.username.clone()),
                )?;
                key_value_store.set_string(
                    KeyType::SettingsSyncPasswordSha256,
                    Some(settings.password_sha256.clone()),
                )?;
                key_value_store.set_i64(
                    KeyType::SettingsSyncIntervalSeconds,
                    Some(settings.interval_seconds as i64),
                )?;
                Ok(())
            })
            .map_err(|err| UpdateSettingsError::RepositoryError(err.to_inner_error()))?;
        Ok(result)
    }

    fn is_sync_disabled(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        Ok(KeyValueStoreRepository::new(&ctx.connection)
            .get_bool(KeyType::SettingsSyncIsDisabled)?
            .unwrap_or(false))
    }

    fn disable_sync(&self, ctx: &ServiceContext) -> Result<(), RepositoryError> {
        KeyValueStoreRepository::new(&ctx.connection)
            .set_bool(KeyType::SettingsSyncIsDisabled, Some(true))
    }
}

pub struct SettingsService;
impl SettingsServiceTrait for SettingsService {}
