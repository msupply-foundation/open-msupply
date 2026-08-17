use async_trait::async_trait;
use repository::{
    BackendPluginRowRepository, ChangelogRow, ChangelogTableName, KeyType, RowActionType,
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
        // BACKEND plugin deletes are still intentionally not applied to the
        // in-memory cache: only the DB row is removed (by uninstall_plugin / a
        // sync delete), while the bound instance keeps running until the next
        // server restart. See issue #12169.
        //
        // FRONTEND plugins no longer work that way. Their cache holds every
        // compatible version of every code, so an incremental bind cannot tell
        // which cached entry a change retires; instead any change to the table,
        // upsert or delete, rebuilds the cache from the DB. An uninstalled
        // bundle therefore stops being served here rather than at the next
        // restart — which is also what makes swapping between the old-UI and
        // new-UI bundles of one plugin testable on a running server.
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
            (ChangelogTableName::FrontendPlugin, _) => {
                service_provider
                    .plugin_service
                    .reload_frontend_plugins(ctx)?;
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
