use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{ConsumptionRow, PluginType};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::AverageMonthlyDistribution
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "AverageMonthlyDistributionInput")]
pub struct Input {
    pub store_id: String,
    pub consumption_rows: Vec<ConsumptionRow>,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "AverageMonthlyDistributionOutput")]
pub struct Output {
    pub amc_consumption_rows: Vec<ConsumptionRow>,
    pub amd_consumption_rows: Vec<ConsumptionRow>,
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}
