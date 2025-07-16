use std::sync::Arc;

use async_trait::async_trait;
use repository::{ChangelogFilter, ChangelogRow};
use util::format_error;

use crate::{
    backend_plugin::{
        plugin_provider::{PluginInstance, PluginResult},
        types::processor,
    },
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

pub(crate) struct PluginProcessor(pub(crate) Arc<PluginInstance>);

impl PluginProcessor {
    pub fn call(&self, input: processor::Input) -> PluginResult<processor::Output> {
        processor::Trait::call(&(*self.0), input)
    }

    fn skip_on_error_inner(&self) -> Result<bool, ProcessorError> {
        let input = processor::Input::SkipOnError;
        let result = self
            .call(input.clone())
            .map_err(|e| ProcessorError::PluginError(input.clone(), e))?;

        let processor::Output::SkipOnError(skip_on_error) = result else {
            return Err(ProcessorError::PluginOutputMismatch(input));
        };

        Ok(skip_on_error)
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

    fn skip_on_error(&self) -> bool {
        match self.skip_on_error_inner() {
            Ok(skip_on_error) => skip_on_error,
            Err(e) => {
                // Log to console and skip log by default
                log::error!("Error in plugin processor: {}", format_error(&e));
                true
            }
        }
    }

    /// Default to using change_log_table_names
    fn changelogs_filter(&self, _: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
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
        _: &ServiceContext,
        _: &ServiceProvider,
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
