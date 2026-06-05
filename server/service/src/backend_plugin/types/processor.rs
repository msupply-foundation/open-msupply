use std::sync::Arc;

use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, call_plugin_async, PluginResult};
use repository::{ChangelogFilter, ChangelogRow, PluginType};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::Processor
}

#[derive(TS, Clone, Deserialize, Debug, Serialize)]
#[serde(tag = "t", content = "v")]
#[ts(rename = "ProcessorInput")]
pub enum Input {
    Filter,
    SkipOnError,
    Process(ChangelogRow),
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[serde(tag = "t", content = "v")]
#[ts(rename = "ProcessorOutput")]
pub enum Output {
    SkipOnError(bool),
    Filter(ChangelogFilter),
    Process(Option<String>),
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}

/// Async variant of [`Trait::call`], runs the plugin on the blocking pool. See issue #11949.
pub async fn call_async(plugin: Arc<PluginInstance>, input: Input) -> PluginResult<Output> {
    call_plugin_async(input, plugin_type(), plugin).await
}
