use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::PluginType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::GetConsumption
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "GetConsumptionInput")]
pub struct Input {
    pub store_id: String,
    pub item_ids: Vec<String>,
    pub start_date: String,
    pub end_date: String,
}

pub type Output = HashMap<String /* item_id */, f64 /* consumption */>;

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}
