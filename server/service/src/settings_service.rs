use repository::{schema::KeyValueType, KeyValueStoreRepository, RepositoryError};
use reqwest::Url;

use crate::{service_provider::ServiceContext, sync_settings::SyncSettings};

#[derive(Debug)]
pub enum UpdateSettingsError {
    RepositoryError(RepositoryError),
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

        let url = key_value_store.get_string(KeyValueType::SettingsSyncUrl)?;
        let username = key_value_store.get_string(KeyValueType::SettingsSyncUsername)?;
        let password_sha256 =
            key_value_store.get_string(KeyValueType::SettingsSyncPasswordSha256)?;
        let interval_sec = key_value_store.get_i64(KeyValueType::SettingsSyncIntervalSec)?;
        let central_server_site_id =
            key_value_store.get_i32(KeyValueType::SettingsSyncCentralServerSiteId)?;
        let site_id = key_value_store.get_i32(KeyValueType::SettingsSyncSideId)?;
        let site_hardware_id =
            key_value_store.get_string(KeyValueType::SettingsSyncSideHardwareId)?;

        let make_settings = || {
            Some(SyncSettings {
                url: url?,
                username: username?,
                password_sha256: password_sha256?,
                interval_sec: interval_sec? as u64,
                central_server_site_id: central_server_site_id? as u32,
                site_id: site_id? as u32,
                site_hardware_id: site_hardware_id?,
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
                key_value_store
                    .set_string(KeyValueType::SettingsSyncUrl, Some(settings.url.clone()))?;
                key_value_store.set_string(
                    KeyValueType::SettingsSyncUsername,
                    Some(settings.username.clone()),
                )?;
                key_value_store.set_string(
                    KeyValueType::SettingsSyncPasswordSha256,
                    Some(settings.password_sha256.clone()),
                )?;
                key_value_store.set_i64(
                    KeyValueType::SettingsSyncIntervalSec,
                    Some(settings.interval_sec as i64),
                )?;
                key_value_store.set_i32(
                    KeyValueType::SettingsSyncCentralServerSiteId,
                    Some(settings.central_server_site_id as i32),
                )?;
                key_value_store.set_i32(
                    KeyValueType::SettingsSyncSideId,
                    Some(settings.site_id as i32),
                )?;
                key_value_store.set_string(
                    KeyValueType::SettingsSyncSideHardwareId,
                    Some(settings.site_hardware_id.clone()),
                )?;
                Ok(())
            })
            .map_err(|err| UpdateSettingsError::RepositoryError(err.to_inner_error()))?;
        Ok(result)
    }
}

pub struct SettingsService {}
impl SettingsServiceTrait for SettingsService {}
