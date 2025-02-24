use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{PluginDataRow, RequisitionLineRow, RequisitionRow};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformRequisitionLineInput")]
pub struct Input {
    pub requisition: RequisitionRow,
    pub lines: Vec<RequisitionLineRow>,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformRequisitionLineOutput")]
pub struct Output {
    pub transformed_lines: Vec<RequisitionLineRow>,
    pub plugin_data: Option<Vec<PluginDataRow>>,
}
pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, "transform_requisition_lines", self)?)
    }
}
