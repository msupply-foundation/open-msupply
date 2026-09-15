use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;

use repository::assets::asset_type_row::AssetTypeRow;
use service::ListResult;

#[derive(PartialEq, Debug)]

pub struct AssetTypeNode {
    pub asset_type: AssetTypeRow,
}

#[derive(SimpleObject)]

pub struct AssetTypeConnector {
    total_count: u32,
    nodes: Vec<AssetTypeNode>,
}

#[Object]
impl AssetTypeNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn category_id(&self) -> &str {
        &self.row().category_id
    }
}

#[derive(Union)]
pub enum AssetTypesResponse {
    Response(AssetTypeConnector),
}

#[derive(Union)]

pub enum AssetTypeResponse {
    Error(NodeError),
    Response(AssetTypeNode),
}

impl AssetTypeNode {
    pub fn from_domain(asset_type: AssetTypeRow) -> AssetTypeNode {
        AssetTypeNode { asset_type }
    }
    pub fn row(&self) -> &AssetTypeRow {
        &self.asset_type
    }
}

impl AssetTypeConnector {
    pub fn from_domain(asset_types: ListResult<AssetTypeRow>) -> AssetTypeConnector {
        AssetTypeConnector {
            total_count: asset_types.count,
            nodes: asset_types
                .rows
                .into_iter()
                .map(AssetTypeNode::from_domain)
                .collect(),
        }
    }
}
