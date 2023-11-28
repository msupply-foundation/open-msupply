use async_graphql::*;
use repository::{PluginData, PluginDataRow, RelatedRecordType};

#[derive(PartialEq, Debug)]
pub struct PluginDataNode {
    pub plugin_data: PluginData,
}

#[derive(SimpleObject)]
pub struct PluginDataConnector {
    total_count: u32,
    nodes: Vec<PluginDataNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum RelatedRecordNodeType {
    StockLine,
}

#[Object]
impl PluginDataNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn plugin_name(&self) -> &str {
        &self.row().plugin_name
    }

    pub async fn related_record_id(&self) -> &str {
        &self.row().related_record_id
    }

    pub async fn related_record_type(&self) -> RelatedRecordNodeType {
        RelatedRecordNodeType::from_domain(&self.row().related_record_type)
    }

    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }

    pub async fn data(&self) -> &String {
        &self.row().data
    }
}

impl RelatedRecordNodeType {
    pub fn from_domain(from: &RelatedRecordType) -> RelatedRecordNodeType {
        use RelatedRecordNodeType as to;
        use RelatedRecordType as from;

        match from {
            from::StockLine => to::StockLine,
        }
    }

    pub fn to_domain(self) -> RelatedRecordType {
        use RelatedRecordNodeType as from;
        use RelatedRecordType as to;

        match self {
            from::StockLine => to::StockLine,
        }
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
    pub fn from_vec(plugin_data: Vec<PluginData>) -> PluginDataConnector {
        PluginDataConnector {
            total_count: plugin_data.len() as u32,
            nodes: plugin_data
                .into_iter()
                .map(|plugin_data| PluginDataNode::from_domain(plugin_data))
                .collect(),
        }
    }
}
