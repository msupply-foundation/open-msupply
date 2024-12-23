use crate::{
    backend_plugin::{plugin_provider::PluginInstance, *},
    item_stats::ItemStatsFilter,
};
use plugin_provider::{call_plugin, PluginResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Deserialize, Serialize)]
pub struct AverageMonthlyConsumptionItem {
    pub average_monthly_consumption: Option<f64>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Input {
    pub store_id: String,
    pub amc_lookback_months: f64,
    pub consumption_map: HashMap<String /* item_id */, f64 /* consumption */>,
    pub filter: Option<ItemStatsFilter>,
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
        Ok(call_plugin(input, "average_monthly_consumption", self)?)
    }
}
