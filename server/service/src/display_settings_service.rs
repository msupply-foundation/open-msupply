use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};

use crate::{
    service_provider::ServiceContext,
    settings::{DisplaySettingNode, DisplaySettingsInput, DisplaySettingsNode},
};
use util::hash::sha256;

pub struct UpdateResult {
    pub logo: Option<String>,
    pub theme: Option<String>,
}

pub trait DisplaySettingsServiceTrait: Sync + Send {
    /// Loads display settings from the DB
    fn display_settings(
        &self,
        ctx: &ServiceContext,
    ) -> Result<DisplaySettingsNode, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let custom_logo_hash = key_value_store
            .get_string(KeyValueType::SettingsDisplayCustomLogoHash)?
            .unwrap_or("".to_string());
        let custom_theme_hash = key_value_store
            .get_string(KeyValueType::SettingsDisplayCustomThemeHash)?
            .unwrap_or("".to_string());

        let custom_logo = key_value_store
            .get_string(KeyValueType::SettingsDisplayCustomLogo)?
            .map(|value| DisplaySettingNode {
                value,
                hash: custom_logo_hash,
            });
        let custom_theme =
            match key_value_store.get_string(KeyValueType::SettingsDisplayCustomTheme)? {
                Some(value) => Some(DisplaySettingNode {
                    value,
                    hash: custom_theme_hash,
                }),
                None => None,
            };

        let display_settings = DisplaySettingsNode {
            custom_logo,
            custom_theme,
        };

        Ok(display_settings)
    }

    fn update_display_settings(
        &self,
        ctx: &ServiceContext,
        settings: &DisplaySettingsInput,
    ) -> Result<UpdateResult, RepositoryError> {
        let result = ctx
            .connection
            .transaction_sync(|con| {
                let key_value_store = KeyValueStoreRepository::new(con);
                let mut update_result = UpdateResult {
                    logo: None,
                    theme: None,
                };

                if let Some(logo) = &settings.custom_logo {
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomLogo,
                        settings.custom_logo.clone(),
                    )?;
                    let logo_hash = Some(sha256(&logo));
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomLogoHash,
                        logo_hash.clone(),
                    )?;
                    update_result.logo = logo_hash;
                }

                if let Some(theme) = &settings.custom_theme {
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomTheme,
                        settings.custom_theme.clone(),
                    )?;
                    let theme_hash = Some(sha256(&theme));
                    key_value_store.set_string(
                        KeyValueType::SettingsDisplayCustomThemeHash,
                        theme_hash.clone(),
                    )?;
                    update_result.theme = theme_hash;
                }

                Ok(update_result)
            })
            .map_err(|err| err)?;
        Ok(result)
    }
}

pub struct DisplaySettingsService {}
impl DisplaySettingsServiceTrait for DisplaySettingsService {}
