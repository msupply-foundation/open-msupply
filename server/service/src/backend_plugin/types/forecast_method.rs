use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{DisplayRow, PluginType};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::ForecastMethod
}

/// Plugin-supplied forecasting methods. The dispatcher hands the plugin a
/// per-line context plus any already-computed parent line forecasts (so a
/// plugin can build "child of parent" methods analogous to AncillaryRatio).
///
/// Plugins are not invoked in v1 from the built-in dispatcher, but the trait
/// + variant are defined here so future plugins can drop in without further
/// schema changes.
#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "ForecastMethodInput")]
pub struct Input {
    pub store_id: String,
    pub requisition_id: String,
    pub line: ForecastLineContext,
    pub parent_lines: Vec<ForecastLineContext>,
}

#[derive(TS, Clone, Deserialize, Serialize)]
pub struct ForecastLineContext {
    pub line_id: String,
    pub item_id: String,
    pub item_name: String,
    pub average_monthly_consumption: f64,
    pub available_stock_on_hand: f64,
    /// `Some` for parents whose forecast has already been computed in pass 1.
    pub forecast_monthly_usage: Option<f64>,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "ForecastMethodOutput")]
pub struct Output {
    pub forecast_monthly_usage: f64,
    pub forecast_doses: Option<f64>,
    pub display: Vec<DisplayRow>,
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}
