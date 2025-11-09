use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{call_plugin, PluginResult};
use repository::{PluginDataRow, PluginType};
use serde::{Deserialize, Serialize};

use ts_rs::TS;

fn plugin_type() -> PluginType {
    PluginType::SyncEssentialItemList
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "syncEssentialItemListInput")]
pub struct Input {
    pub id: String,
    pub is_essential: bool,
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<PluginDataRow>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<PluginDataRow> {
        Ok(call_plugin(input, plugin_type(), self)?)
    }
}
