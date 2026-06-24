use std::sync::Arc;

use async_trait::async_trait;
<<<<<<< HEAD
use repository::{ChangelogFilter, ChangelogRow, PluginType};
=======
use repository::{ChangelogRow, CompatibilityChangelogFilter};
>>>>>>> origin/v3.0.0-RC
use util::format_error;

use crate::{
    backend_plugin::{
        plugin_provider::{call_plugin_async, PluginInstance},
        types::processor,
    },
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

pub(crate) struct PluginProcessor(pub(crate) Arc<PluginInstance>);

impl PluginProcessor {
    /// Run the plugin on the blocking pool. Calling a plugin runs the whole boajs interpreter
    /// synchronously (including any `fetch`/`use_graphql` http calls), so this is the single
    /// async abstraction the `Processor` impl below delegates to, keeping it off the runtime.
    /// See issue #11949.
    async fn call(&self, input: processor::Input) -> Result<processor::Output, ProcessorError> {
        call_plugin_async(input.clone(), PluginType::Processor, self.0.clone())
            .await
            .map_err(|e| ProcessorError::PluginError(input, e))
    }
}

#[async_trait]
impl Processor for PluginProcessor {
    // Description and cursor type is plugin code
    fn get_description(&self) -> String {
        format!("Plugin processor for {}", self.0.code)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Dynamic(self.0.code.clone())
    }

    async fn skip_on_error(&self) -> bool {
        let input = processor::Input::SkipOnError;
        match self.call(input.clone()).await {
            Ok(processor::Output::SkipOnError(skip_on_error)) => skip_on_error,
            Ok(_) => {
                let error = ProcessorError::PluginOutputMismatch(input);
                log::error!("Error in plugin processor: {}", format_error(&error));
                // Skip log by default
                true
            }
            Err(error) => {
                // Log to console and skip log by default
                log::error!("Error in plugin processor: {}", format_error(&error));
                true
            }
        }
    }

<<<<<<< HEAD
    /// Default to using change_log_table_names
    async fn changelogs_filter(
        &self,
        _: &ServiceContext,
    ) -> Result<ChangelogFilter, ProcessorError> {
=======
    fn compatibility_filter(
        &self,
        _: &ServiceContext,
    ) -> Result<Option<CompatibilityChangelogFilter>, ProcessorError> {
>>>>>>> origin/v3.0.0-RC
        let input = processor::Input::Filter;
        let processor::Output::Filter(filter) = self.call(input.clone()).await? else {
            return Err(ProcessorError::PluginOutputMismatch(input));
        };

        Ok(Some(filter))
    }

    async fn try_process_record(
        &self,
        _: &ServiceContext,
        _: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let input = processor::Input::Process(changelog.clone());
        let processor::Output::Process(status) = self.call(input.clone()).await? else {
            return Err(ProcessorError::PluginOutputMismatch(input));
        };

        Ok(status)
    }
}
