use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};

use crate::{service_provider::ServiceContext, settings::DisplaySettings};

pub trait DisplaySettingsServiceTrait: Sync + Send {
    /// Loads display settings from the DB
    fn display_settings(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<DisplaySettings>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let custom_logo = key_value_store.get_string(KeyValueType::SettingsDisplayCustomLogo)?;
        let custom_theme = key_value_store.get_string(KeyValueType::SettingsDisplayCustomTheme)?;
        let make_settings = || {
            Some(DisplaySettings {
                custom_logo,
                custom_theme,
            })
        };

        Ok(make_settings())
    }

    fn update_display_settings(
        &self,
        ctx: &ServiceContext,
        settings: &DisplaySettings,
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
