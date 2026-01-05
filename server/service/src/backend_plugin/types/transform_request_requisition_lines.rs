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
    // Adding js/ts doc comment here rather then on the type makes it show up when hovering ofer transform_request_requisition_line input (in plugin code)
    #[doc = "The variants in this list may not represent all of the areas where request requisition line is upserted"]
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
        mut lines: Vec<RequisitionLineRow>,
        requisition: &RequisitionRow,
    ) -> PluginResult<(Vec<RequisitionLineRow>, Vec<PluginDataRow>)> {
        let plugins = PluginInstance::get_all(plugin_type());

        let mut plugin_data: Vec<PluginDataRow> = Vec::new();
        for plugin in plugins {
            let result = Trait::call(
                &(*plugin),
                Input {
                    context: context.clone(),
                    requisition: requisition.clone(),
                    lines,
                },
            )?;
            lines = result.transformed_lines;
            plugin_data.extend(result.plugin_data.unwrap_or_default());
        }

        Ok((
            lines,
            plugin_data,
        ))
    }
}
