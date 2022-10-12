use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};

use crate::{service_provider::ServiceContext, settings::DisplaySettings};

pub struct UpdateResult {
    pub logo: bool,
    pub theme: bool,
}

pub trait DisplaySettingsServiceTrait: Sync + Send {
    /// Loads display settings from the DB
    fn display_settings(&self, ctx: &ServiceContext) -> Result<DisplaySettings, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let custom_logo = key_value_store.get_string(KeyValueType::SettingsDisplayCustomLogo)?;
        let custom_theme = key_value_store.get_string(KeyValueType::SettingsDisplayCustomTheme)?;
        let display_settings = DisplaySettings {
            custom_logo,
            custom_theme,
        };

        Ok(display_settings)
    }

    fn update_display_settings(
        &self,
        ctx: &ServiceContext,
        settings: &DisplaySettings,
    ) -> Result<UpdateResult, RepositoryError> {
        let result = ctx
            .connection
            .transaction_sync(|con| {
                let key_value_store = KeyValueStoreRepository::new(con);
                let mut update_result = UpdateResult {
                    logo: false,
                    theme: false,
                };

                if let Some(_) = &settings.custom_logo {
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomLogo,
                        settings.custom_logo.clone(),
                    )?;
                    update_result.logo = true;
                }

                if let Some(_) = &settings.custom_theme {
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomTheme,
                        settings.custom_theme.clone(),
                    )?;
                    update_result.theme = true;
                }

                Ok(update_result)
            })
            .map_err(|err| err)?;
        Ok(result)
    }
}

pub struct DisplaySettingsService {}
impl DisplaySettingsServiceTrait for DisplaySettingsService {}
