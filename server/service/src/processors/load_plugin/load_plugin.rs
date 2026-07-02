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
        // Plugin deletes are intentionally not applied to the in-memory cache:
        // only the DB row is removed (by uninstall_plugin / a sync delete), while
        // the cached instance keeps serving until the next server restart, when
        // reload_all_plugins rebuilds the cache from the DB. This avoids
        // reconciling the live cache against remaining DB versions on delete.
        // See issue #12169.
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
