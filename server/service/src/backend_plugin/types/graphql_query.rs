use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::PluginType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::GraphqlQuery
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "GraphqlQueryInput")]
pub struct Input {
    pub store_id: String,
    pub input: serde_json::Value,
}

pub type Output = serde_json::Value;

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}
