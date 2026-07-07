use std::sync::Arc;

use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, call_plugin_async, PluginResult};
use repository::PluginType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::Schedule
}

#[derive(TS, Clone, Deserialize, Debug, Serialize)]
#[ts(rename = "ScheduleInput")]
pub struct Input {}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "ScheduleOutput")]
pub struct Output {
    // u32 (not u64) so ts-rs generates a `number` rather than a `bigint`. boa cannot
    // serialize a BigInt to json (see JsValue::to_json), so a bigint field would make
    // this plugin interface unusable. u32 seconds (~136 years) is plenty for a poll interval.
    pub next_poll_seconds: u32,
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
