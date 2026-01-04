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
    pub consumption_map: HashMap<String /* item_id */, f64 /* total consumption */>,
    pub item_ids: Vec<String>,
    pub adjusted_days_out_of_stock_map:
        Option<HashMap<String /* item_id */, f64 /* days out of stock adjustment */>>,
}

pub type Output = HashMap<String /* item_id */, AverageMonthlyConsumptionItem>;

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}
