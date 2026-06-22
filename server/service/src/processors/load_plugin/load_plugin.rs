use async_trait::async_trait;
use repository::{ChangelogRow, ChangelogTableName, KeyType};

use crate::{
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
        // Any plugin changelog — upsert or delete — rebuilds the whole cache
        // from the DB and atomically swaps it in (reload_all_plugins). One path
        // covers installs, deletes, downgrades and removals. See issue #12169.
        match &changelog.table_name {
            ChangelogTableName::BackendPlugin | ChangelogTableName::FrontendPlugin => {
                service_provider.plugin_service.reload_all_plugins(ctx)?;
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
