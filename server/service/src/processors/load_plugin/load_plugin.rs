use async_trait::async_trait;
use repository::{
    BackendPluginRowRepository, ChangelogRow, ChangelogTableName, FrontendPluginRowRepository,
    KeyType, RowActionType,
};

use crate::{
    backend_plugin::plugin_provider::PluginInstance,
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

const DESCRIPTION: &str = "Load plugins";

pub(crate) struct LoadPlugin;

#[async_trait]
impl Processor for LoadPlugin {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        match (&changelog.table_name, &changelog.row_action) {
            (ChangelogTableName::BackendPlugin, RowActionType::Upsert) => {
                let plugin = BackendPluginRowRepository::new(&ctx.connection)
                    .find_one_by_id(&changelog.record_id)?
                    .ok_or(ProcessorError::RecordNotFound(
                        "Backend plugin".to_string(),
                        changelog.record_id.clone(),
                    ))?;

                PluginInstance::bind(plugin);
            }
            (ChangelogTableName::BackendPlugin, RowActionType::Delete) => {
                PluginInstance::unbind_by_id(&ctx.connection, &changelog.record_id)?;
            }
            (ChangelogTableName::FrontendPlugin, RowActionType::Upsert) => {
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
            (ChangelogTableName::FrontendPlugin, RowActionType::Delete) => {
                service_provider
                    .plugin_service
                    .unbind_frontend_plugin_by_id(ctx, &changelog.record_id);
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

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::LoadPluginProcessorCursor)
    }
}
