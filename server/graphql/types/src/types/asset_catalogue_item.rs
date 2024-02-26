use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;
use repository::assets::asset_catalogue_item_row::AssetCatalogueItemRow;
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueItemNode {
    pub asset_catalogue_item: AssetCatalogueItemRow,
}

#[derive(SimpleObject)]
pub struct AssetCatalogueItemConnector {
    total_count: u32,
    nodes: Vec<AssetCatalogueItemNode>,
}

#[Object]
impl AssetCatalogueItemNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn asset_category_id(&self) -> &str {
        &self.row().category_id
    }

    pub async fn asset_class_id(&self) -> &str {
        &self.row().class_id
    }
    pub async fn asset_type_id(&self) -> &str {
        &self.row().type_id
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }
    pub async fn manufacturer(&self) -> Option<String> {
        self.row().manufacturer.as_ref().map(|it| it.clone())
    }
    pub async fn model(&self) -> &str {
        &self.row().model
    }
}

#[derive(Union)]
pub enum AssetCatalogueItemsResponse {
    Response(AssetCatalogueItemConnector),
}

#[derive(Union)]
pub enum AssetCatalogueItemResponse {
    Error(NodeError),
    Response(AssetCatalogueItemNode),
}

impl AssetCatalogueItemNode {
    pub fn from_domain(asset_catalogue_item: AssetCatalogueItemRow) -> AssetCatalogueItemNode {
        AssetCatalogueItemNode {
            asset_catalogue_item,
        }
    }

    pub fn row(&self) -> &AssetCatalogueItemRow {
        &self.asset_catalogue_item
    }
}

impl AssetCatalogueItemConnector {
    pub fn from_domain(
        asset_catalogue_items: ListResult<AssetCatalogueItemRow>,
    ) -> AssetCatalogueItemConnector {
        AssetCatalogueItemConnector {
            total_count: asset_catalogue_items.count,
            nodes: asset_catalogue_items
                .rows
                .into_iter()
                .map(AssetCatalogueItemNode::from_domain)
                .collect(),
        }
    }
}
