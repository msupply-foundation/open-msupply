use std::sync::Arc;

use async_trait::async_trait;
use repository::{
    BackendPluginRowRepository, ChangelogFilter, ChangelogRow, ChangelogTableName,
    FrontendPluginRowRepository, KeyType,
};

use crate::{
    backend_plugin::{
        plugin_provider::{PluginInstance, PluginResult},
        types::processor,
    },
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

pub(crate) struct PluginProcessor(Arc<PluginInstance>);

impl PluginProcessor {
    pub fn call(&self, input: processor::Input) -> PluginResult<processor::Output> {
        processor::Trait::call(&(*self.0), input)
    }
}

#[async_trait]
impl Processor for PluginProcessor {
    // Description and cursor type is plugin code
    fn get_description(&self) -> String {
        format!("Plugin processor for {}", (&self.0).code)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Dynamic(self.0.code.clone())
    }

    /// Default to using change_log_table_names
    fn changelogs_filter(&self, _ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        let input = processor::Input::Filter;
        let result = self
            .call(input.clone())
            .map_err(|e| ProcessorError::PluginError(input.clone(), e))?;

        let processor::Output::Filter(filter) = result else {
            return Err(ProcessorError::PluginOutputMismatch(input));
        };

        Ok(filter)
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let input = processor::Input::Process(changelog.clone());
        let result = self
            .call(input.clone())
            .map_err(|e| ProcessorError::PluginError(input.clone(), e))?;

        let processor::Output::Process(status) = result else {
            return Err(ProcessorError::PluginOutputMismatch(input));
        };

        Ok(status)
    }
}
