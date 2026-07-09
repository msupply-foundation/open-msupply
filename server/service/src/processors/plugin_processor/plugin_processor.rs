use std::sync::Arc;

use async_trait::async_trait;
use repository::{ChangelogRow, CompatibilityChangelogFilter, PluginType};
use util::format_error;

use crate::{
    backend_plugin::{
        plugin_provider::{call_plugin, call_plugin_async, PluginInstance},
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

    /// Plugins use the pre-v7 compatibility changelog filter path. This is the synchronous
    /// trait method (see `Processor::compatibility_filter`), so it calls the plugin via the
    /// synchronous `call_plugin` rather than the async `call` helper used elsewhere.
    fn compatibility_filter(
        &self,
        _: &ServiceContext,
    ) -> Result<Option<CompatibilityChangelogFilter>, ProcessorError> {
        let input = processor::Input::Filter;
        let result = call_plugin(input.clone(), PluginType::Processor, &self.0)
            .map_err(|e| ProcessorError::PluginError(input.clone(), e))?;

        let processor::Output::Filter(filter) = result else {
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
