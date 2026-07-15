use repository::{
    database_settings::DatabaseSettings, KeyType, KeyValueStoreRepository, RepositoryError,
};
use reqwest::Url;
use thiserror::Error;

use crate::{
    service_provider::ServiceContext,
    settings::{ServerSettings, Settings},
    sync::settings::{BatchSize, SyncSettings},
};

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
            "Invalid url: {err:?}"
        )));
    }

    if settings.username.is_empty() {
        return Err(UpdateSettingsError::InvalidSettings(
            "Empty username not allowed".to_string(),
        ));
    }

    let BatchSize {
        remote_pull,
        remote_push,
        central_pull,
    } = settings.batch_size;
    if remote_pull == 0 || remote_push == 0 || central_pull == 0 {
        return Err(UpdateSettingsError::InvalidSettings(
            "Sync batch size must be at least 1".to_string(),
        ));
    }

    Ok(())
}

pub trait SettingsServiceTrait: Sync + Send {
    /// Loads sync settings from the DB. Batch sizes persisted in the KV store
    /// (set via the UI) take precedence per field; otherwise they fall back to
    /// `ctx.batch_size` (YAML or compiled defaults).
    fn sync_settings(&self, ctx: &ServiceContext) -> Result<Option<SyncSettings>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let url = key_value_store.get_string(KeyType::SettingsSyncUrl)?;
        let username = key_value_store.get_string(KeyType::SettingsSyncUsername)?;
        let password_sha256 = key_value_store.get_string(KeyType::SettingsSyncPasswordSha256)?;
        let interval_seconds = key_value_store.get_i64(KeyType::SettingsSyncIntervalSeconds)?;

        // Fall back per field to `ctx.batch_size` (YAML or compiled defaults),
        // so sites that were initialised before batch size was persisted keep
        // working.
        let fallback = ctx.batch_size.clone();
        let batch_size = BatchSize {
            remote_pull: key_value_store
                .get_i64(KeyType::SettingsSyncBatchSizeRemotePull)?
                .map(|v| v as u32)
                .unwrap_or(fallback.remote_pull),
            remote_push: key_value_store
                .get_i64(KeyType::SettingsSyncBatchSizeRemotePush)?
                .map(|v| v as u32)
                .unwrap_or(fallback.remote_push),
            central_pull: key_value_store
                .get_i64(KeyType::SettingsSyncBatchSizeCentralPull)?
                .map(|v| v as u32)
                .unwrap_or(fallback.central_pull),
        };
        let disable_integration_transaction = ctx.disable_integration_transaction;
        let relax_hardware_id_token_checks = ctx.relax_hardware_id_token_checks;

        // `?` inside this closure would result in closure returning `None`
        let make_settings = || {
            Some(SyncSettings {
                url: url?,
                username: username?,
                password_sha256: password_sha256?,
                interval_seconds: interval_seconds? as u64,
                batch_size,
                disable_integration_transaction,
                relax_hardware_id_token_checks,
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

        ctx.connection
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
                key_value_store.set_i64(
                    KeyType::SettingsSyncBatchSizeRemotePull,
                    Some(settings.batch_size.remote_pull as i64),
                )?;
                key_value_store.set_i64(
                    KeyType::SettingsSyncBatchSizeRemotePush,
                    Some(settings.batch_size.remote_push as i64),
                )?;
                key_value_store.set_i64(
                    KeyType::SettingsSyncBatchSizeCentralPull,
                    Some(settings.batch_size.central_pull as i64),
                )?;
                Ok(())
            })
            .map_err(|err| UpdateSettingsError::RepositoryError(err.to_inner_error()))?;
        Ok(())
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

    fn get_database_info(&self) -> Result<DatabaseSettings, UpdateSettingsError>;

    fn get_server_settings_info(&self) -> Result<ServerSettings, UpdateSettingsError>;
}

pub struct SettingsService {
    pub service: Option<Settings>,
}

impl SettingsService {
    pub fn new(settings: Option<Settings>) -> Self {
        SettingsService { service: settings }
    }
}

impl SettingsServiceTrait for SettingsService {
    fn get_database_info(&self) -> Result<DatabaseSettings, UpdateSettingsError> {
        match &self.service {
            None => Err(UpdateSettingsError::InvalidSettings(
                "Settings not initialized".to_string(),
            )),
            Some(settings) => Ok(settings.database.clone()),
        }
    }

    fn get_server_settings_info(&self) -> Result<ServerSettings, UpdateSettingsError> {
        match &self.service {
            None => Err(UpdateSettingsError::InvalidSettings(
                "Settings not initialized".to_string(),
            )),
            Some(settings) => Ok(settings.server.clone()),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, KeyType, KeyValueStoreRepository};

    use crate::{sync::settings::BatchSize, test_helpers::setup_all_and_service_provider};

    use super::*;

    fn valid_settings(batch_size: BatchSize) -> SyncSettings {
        SyncSettings {
            url: "http://localhost:8000".to_string(),
            username: "test_site".to_string(),
            password_sha256: "password_hash".to_string(),
            interval_seconds: 300,
            batch_size,
            disable_integration_transaction: false,
            relax_hardware_id_token_checks: false,
        }
    }

    #[actix_rt::test]
    async fn sync_settings_batch_size_round_trip() {
        let ctx = setup_all_and_service_provider(
            "sync_settings_batch_size_round_trip",
            MockDataInserts::none(),
        )
        .await;
        let service = &ctx.service_provider.settings;

        // A uniform value entered via the UI is applied to all three batch sizes
        let uniform = BatchSize {
            remote_pull: 100,
            remote_push: 100,
            central_pull: 100,
        };
        service
            .update_sync_settings(&ctx.service_context, &valid_settings(uniform.clone()))
            .unwrap();

        let loaded = service
            .sync_settings(&ctx.service_context)
            .unwrap()
            .unwrap();
        assert_eq!(loaded.batch_size, uniform);

        // Non-uniform values (e.g. from yaml config) round-trip too
        let non_uniform = BatchSize {
            remote_pull: 250,
            remote_push: 800,
            central_pull: 300,
        };
        service
            .update_sync_settings(&ctx.service_context, &valid_settings(non_uniform.clone()))
            .unwrap();

        let loaded = service
            .sync_settings(&ctx.service_context)
            .unwrap()
            .unwrap();
        assert_eq!(loaded.batch_size, non_uniform);
    }

    #[actix_rt::test]
    async fn sync_settings_batch_size_defaults_when_unset() {
        let ctx = setup_all_and_service_provider(
            "sync_settings_batch_size_defaults_when_unset",
            MockDataInserts::none(),
        )
        .await;

        // Simulate a site initialised before batch size was persisted: only the
        // base sync keys are present, none of the batch size keys.
        let kv = KeyValueStoreRepository::new(&ctx.connection);
        kv.set_string(KeyType::SettingsSyncUrl, Some("http://localhost:8000".to_string()))
            .unwrap();
        kv.set_string(KeyType::SettingsSyncUsername, Some("test_site".to_string()))
            .unwrap();
        kv.set_string(KeyType::SettingsSyncPasswordSha256, Some("password_hash".to_string()))
            .unwrap();
        kv.set_i64(KeyType::SettingsSyncIntervalSeconds, Some(300)).unwrap();

        let loaded = ctx
            .service_provider
            .settings
            .sync_settings(&ctx.service_context)
            .unwrap()
            .unwrap();
        assert_eq!(loaded.batch_size, BatchSize::default());
    }

    #[actix_rt::test]
    async fn update_sync_settings_rejects_zero_batch_size() {
        let ctx = setup_all_and_service_provider(
            "update_sync_settings_rejects_zero_batch_size",
            MockDataInserts::none(),
        )
        .await;

        let zero = BatchSize {
            remote_pull: 0,
            remote_push: 0,
            central_pull: 0,
        };
        let result = ctx
            .service_provider
            .settings
            .update_sync_settings(&ctx.service_context, &valid_settings(zero));
        assert!(matches!(
            result,
            Err(UpdateSettingsError::InvalidSettings(_))
        ));
    }
}
