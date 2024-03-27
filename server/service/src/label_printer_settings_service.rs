use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};

use crate::{service_provider::ServiceContext, settings::LabelPrinterSettingNode};

pub trait LabelPrinterSettingsServiceTrait: Sync + Send {
    /// Loads the printer settings from the DB
    fn label_printer_settings(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<LabelPrinterSettingNode>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let label_printer_settings =
            match key_value_store.get_string(KeyValueType::SettingsLabelPrinter)? {
                Some(value) => match serde_json::from_str::<LabelPrinterSettingNode>(&value) {
                    Ok(settings) => Some(settings),
                    Err(_) => None,
                },
                None => None,
            };

        Ok(label_printer_settings)
    }

    fn update_label_printer_settings(
        &self,
        ctx: &ServiceContext,
        settings: &LabelPrinterSettingNode,
    ) -> anyhow::Result<()> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);
        let serialised = serde_json::to_string(settings)?;

        key_value_store.set_string(KeyValueType::SettingsLabelPrinter, Some(serialised))?;

        Ok(())
    }
}

pub struct LabelPrinterSettingsService {}
impl LabelPrinterSettingsServiceTrait for LabelPrinterSettingsService {}
