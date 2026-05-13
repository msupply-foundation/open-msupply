use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
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
    pub next_poll_seconds: u64,
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}
