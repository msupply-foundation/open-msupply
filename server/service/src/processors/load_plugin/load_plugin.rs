use repository::{
    BackendPluginRowRepository, ChangelogRow, ChangelogTableName, FrontendPluginRowRepository,
    KeyType,
};

use crate::{
    backend_plugin::plugin_provider::PluginInstance,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

const DESCRIPTION: &str = "Load plugins";

pub(crate) struct LoadPlugin;

impl Processor for LoadPlugin {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        match changelog.table_name {
            ChangelogTableName::BackendPlugin => {
                let plugin = BackendPluginRowRepository::new(&ctx.connection)
                    .find_one_by_id(&changelog.record_id)?
                    .ok_or(ProcessorError::RecordNotFound(
                        "Backend plugin".to_string(),
                        changelog.record_id.clone(),
                    ))?;

                PluginInstance::bind(plugin);
            }
            ChangelogTableName::FrontendPlugin => {
                let plugin = FrontendPluginRowRepository::new(&ctx.connection)
                    .find_one_by_id(&changelog.record_id)?
                    .ok_or(ProcessorError::RecordNotFound(
                        "Frontend plugin".to_string(),
                        changelog.record_id.clone(),
                    ))?;

                service_provider
                    .plugin_service
                    .bind_frontend_plugin(ctx, plugin);
            }
            _ => {}
        }

        Ok(Some("success".to_string()))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![
            ChangelogTableName::BackendPlugin,
            ChangelogTableName::FrontendPlugin,
        ]
    }

    fn cursor_type(&self) -> KeyType {
        KeyType::LoadPluginProcessorCursor
    }
}
