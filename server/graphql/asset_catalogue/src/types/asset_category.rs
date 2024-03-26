use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;

use repository::assets::asset_category_row::AssetCategoryRow;
use service::ListResult;

#[derive(PartialEq, Debug)]

pub struct AssetCategoryNode {
    pub asset_category: AssetCategoryRow,
}

#[derive(SimpleObject)]

pub struct AssetCategoryConnector {
    total_count: u32,
    nodes: Vec<AssetCategoryNode>,
}

#[Object]
impl AssetCategoryNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn class_id(&self) -> &str {
        &self.row().class_id
    }
}

#[derive(Union)]
pub enum AssetCategoriesResponse {
    Response(AssetCategoryConnector),
}

#[derive(Union)]
pub enum AssetCategoryResponse {
    Error(NodeError),
    Response(AssetCategoryNode),
}

impl AssetCategoryNode {
    pub fn from_domain(asset_category: AssetCategoryRow) -> AssetCategoryNode {
        AssetCategoryNode { asset_category }
    }
    pub fn row(&self) -> &AssetCategoryRow {
        &self.asset_category
    }
}

impl AssetCategoryConnector {
    pub fn from_domain(asset_categories: ListResult<AssetCategoryRow>) -> AssetCategoryConnector {
        AssetCategoryConnector {
            total_count: asset_categories.count,
            nodes: asset_categories
                .rows
                .into_iter()
                .map(AssetCategoryNode::from_domain)
                .collect(),
        }
    }
}
