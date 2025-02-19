use repository::{
    BackendPluginRowRepository, ChangelogRow, ChangelogTableName, KeyType, StorageConnection,
};

use crate::{
    backend_plugin::plugin_provider::PluginInstance,
    processors::general_processor::{Processor, ProcessorError},
};

const DESCRIPTION: &str = "Load plugins";

pub(crate) struct LoadPlugin;

impl Processor for LoadPlugin {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let plugin = BackendPluginRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(ProcessorError::RecordNotFound(
                "Backend plugin".to_string(),
                changelog.record_id.clone(),
            ))?;

        PluginInstance::bind(plugin);

        Ok(Some("success".to_string()))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::BackendPlugin]
    }

    fn cursor_type(&self) -> KeyType {
        KeyType::LoadPluginProcessorCursor
    }
}
