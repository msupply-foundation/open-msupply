use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{PluginDataRow, PluginType, RequisitionLineRow, RequisitionRow};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::TransformRequestRequisitionLines
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformRequestRequisitionLineInput")]
pub struct Input {
    pub requisition: RequisitionRow,
    pub lines: Vec<RequisitionLineRow>,
    pub context: Context,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformRequestRequisitionLineContext")]
pub enum Context {
    InsertProgramRequestRequisition,
    AddFromMasterList,
    InsertRequestRequisitionLine,
    UpdateRequestRequisition,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformRequestRequisitionLineOutput")]
pub struct Output {
    pub transformed_lines: Vec<RequisitionLineRow>,
    #[ts(optional)]
    pub plugin_data: Option<Vec<PluginDataRow>>,
}
pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}

// Helper
impl PluginInstance {
    pub(crate) fn transform_request_requisition_lines(
        context: Context,
        lines: Vec<RequisitionLineRow>,
        requisition: &RequisitionRow,
    ) -> PluginResult<(Vec<RequisitionLineRow>, Vec<PluginDataRow>)> {
        let Some(plugin) = PluginInstance::get_one(plugin_type()) else {
            return Ok((lines, Vec::new()));
        };

        let result = Trait::call(
            &(*plugin),
            Input {
                context,
                requisition: requisition.clone(),
                lines,
            },
        )?;

        Ok((
            result.transformed_lines,
            result.plugin_data.unwrap_or_default(),
        ))
    }
}
