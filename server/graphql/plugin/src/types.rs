use async_graphql::*;
use chrono::{DateTime, Utc};
use repository::{PluginData, PluginDataRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct PluginDataNode {
    pub plugin_data: PluginData,
}

#[derive(SimpleObject)]
pub struct PluginDataConnector {
    total_count: u32,
    nodes: Vec<PluginDataNode>,
}

#[Object]
impl PluginDataNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn plugin_code(&self) -> &str {
        &self.row().plugin_code
    }

    pub async fn related_record_id(&self) -> Option<String> {
        self.row().related_record_id.to_owned()
    }

    pub async fn data_identifier(&self) -> &str {
        &self.row().data_identifier
    }

    pub async fn store_id(&self) -> Option<String> {
        self.row().store_id.to_owned()
    }

    pub async fn data(&self) -> &String {
        &self.row().data
    }

    /// Optional, plugin-controlled timestamp (e.g. an "update time").
    pub async fn datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .datetime
            .map(|d| DateTime::<Utc>::from_naive_utc_and_offset(d, Utc))
    }
}

impl PluginDataNode {
    pub fn from_domain(plugin_data: PluginData) -> Self {
        PluginDataNode { plugin_data }
    }

    pub fn row(&self) -> &PluginDataRow {
        &self.plugin_data.plugin_data
    }
}

impl PluginDataConnector {
    pub fn from_domain(plugin_data: ListResult<PluginData>) -> PluginDataConnector {
        PluginDataConnector {
            total_count: plugin_data.count,
            nodes: plugin_data
                .rows
                .into_iter()
                .map(PluginDataNode::from_domain)
                .collect(),
        }
    }
}
