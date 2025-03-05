use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::PluginType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::AverageMonthlyConsumption
}

#[derive(TS, Clone, Deserialize, Serialize)]
pub struct AverageMonthlyConsumptionItem {
    pub average_monthly_consumption: Option<f64>,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "AverageMonthlyConsumptionInput")]
pub struct Input {
    pub store_id: String,
    pub amc_lookback_months: f64,
    pub consumption_map: HashMap<String /* item_id */, f64 /* consumption */>,
    pub item_ids: Vec<String>,
}

pub type Output = HashMap<String /* item_id */, AverageMonthlyConsumptionItem>;

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

// average_monthly_consumption -> amc
// call_plugin -> more generic (do ?)

// TODO as macro ? Can do types here too
impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}
