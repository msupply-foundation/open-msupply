use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};

use crate::{service_provider::ServiceContext, settings::DisplaySettings};

pub struct DisplaySettingsInput {
    pub custom_logo: Option<String>,
    pub custom_theme: Option<String>,
}

pub trait DisplaySettingsServiceTrait: Sync + Send {
    /// Loads display settings from the DB
    fn display_settings(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<DisplaySettings>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let custom_logo = key_value_store.get_string(KeyValueType::SettingsDisplayCustomLogo)?;
        let custom_theme = key_value_store.get_string(KeyValueType::SettingsDisplayCustomTheme)?;
        let default_language = key_value_store
            .get_string(KeyValueType::SettingsDisplayDefaultLanguage)
            .unwrap()
            .unwrap_or("en".to_string());

        let make_settings = || {
            Some(DisplaySettings {
                custom_logo,
                custom_theme,
                default_language,
            })
        };

        Ok(make_settings())
    }

    fn update_display_settings(
        &self,
        ctx: &ServiceContext,
        settings: &DisplaySettingsInput,
    ) -> Result<(), RepositoryError> {
        let result = ctx
            .connection
            .transaction_sync(|con| {
                let key_value_store = KeyValueStoreRepository::new(con);

                key_value_store.set_string(
                    KeyValueType::SettingsDisplayCustomLogo,
                    settings.custom_logo.clone(),
                )?;
                key_value_store.set_string(
                    KeyValueType::SettingsDisplayCustomTheme,
                    settings.custom_theme.clone(),
                )?;

                Ok(())
            })
            .map_err(|err| err)?;
        Ok(result)
    }
}

pub struct DisplaySettingsService {}
impl DisplaySettingsServiceTrait for DisplaySettingsService {}
