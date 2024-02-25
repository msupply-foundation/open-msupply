use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;

use repository::assets::{asset_class::AssetClass, asset_class_row::AssetClassRow};
use service::ListResult;

#[derive(PartialEq, Debug)]

pub struct AssetClassNode {
    pub asset_class: AssetClass,
}

#[derive(SimpleObject)]

pub struct AssetClassConnector {
    total_count: u32,
    nodes: Vec<AssetClassNode>,
}

#[Object]
impl AssetClassNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
}

#[derive(Union)]
pub enum AssetClassesResponse {
    Response(AssetClassConnector),
}

#[derive(Union)]
pub enum AssetClassResponse {
    Error(NodeError),
    Response(AssetClassNode),
}

impl AssetClassNode {
    pub fn from_domain(asset_class: AssetClass) -> AssetClassNode {
        AssetClassNode { asset_class }
    }
    pub fn row(&self) -> &AssetClassRow {
        &self.asset_class.asset_class_row
    }
}

impl AssetClassConnector {
    pub fn from_domain(asset_classes: ListResult<AssetClass>) -> AssetClassConnector {
        AssetClassConnector {
            total_count: asset_classes.count,
            nodes: asset_classes
                .rows
                .into_iter()
                .map(AssetClassNode::from_domain)
                .collect(),
        }
    }
}
