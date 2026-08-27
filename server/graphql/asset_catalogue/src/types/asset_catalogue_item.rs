use async_graphql::*;

use async_graphql::dataloader::DataLoader;
use graphql_core::ContextExt;
use graphql_core::{
    loader::{AssetCategoryLoader, AssetClassLoader, AssetTypeLoader},
    simple_generic_errors::NodeError,
};
use repository::assets::asset_catalogue_item_row::AssetCatalogueItemRow;
use service::ListResult;

use super::asset_category::AssetCategoryNode;
use super::asset_class::AssetClassNode;
use super::asset_type::AssetTypeNode;

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

    pub async fn sub_catalogue(&self) -> &str {
        &self.row().sub_catalogue
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
        self.row().manufacturer.clone()
    }

    pub async fn model(&self) -> &str {
        &self.row().model
    }

    pub async fn asset_class(&self, ctx: &Context<'_>) -> Result<Option<AssetClassNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetClassLoader>>();
        Ok(loader
            .load_one(self.row().class_id.clone())
            .await?
            .map(AssetClassNode::from_domain))
    }

    pub async fn asset_category(&self, ctx: &Context<'_>) -> Result<Option<AssetCategoryNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetCategoryLoader>>();
        Ok(loader
            .load_one(self.row().category_id.clone())
            .await?
            .map(AssetCategoryNode::from_domain))
    }

    pub async fn asset_type(&self, ctx: &Context<'_>) -> Result<Option<AssetTypeNode>> {
        let loader = ctx.get_loader::<DataLoader<AssetTypeLoader>>();
        Ok(loader
            .load_one(self.row().type_id.clone())
            .await?
            .map(AssetTypeNode::from_domain))
    }

    pub async fn properties(&self) -> Result<String> {
        let asset_properties = match &self.row().properties {
            Some(properties) => properties.to_owned(),
            None => return Ok("{}".to_string()), // Empty JSON object
        };
        Ok(asset_properties)
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
