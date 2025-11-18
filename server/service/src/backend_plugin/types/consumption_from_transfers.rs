use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{ConsumptionRow, PluginType};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::ConsumptionFromTransfers
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "ConsumptionFromTransfersInput")]
pub struct Input {
    pub store_id: String,
    pub consumption_map: Vec<ConsumptionRow>,
    pub exclude_transfers: bool,
}

pub type Output = HashMap<String /* item_id */, f64 /* transfer consumption */>;

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}
