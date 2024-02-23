use async_graphql::*;

use repository::{
    assets::{
        asset_catalogue_item::{self, AssetCatalogueItem, AssetCatalogueItemFilter},
        asset_catalogue_item_row::AssetCatalogueItemRow,
    },
    EqualFilter, StringFilter,
};
use service::ListResult;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]

pub enum AssetCatalogueItemSortFieldInput {
    Catalogue,
    Code,
    Make,
    Model,
}

#[derive(InputObject)]

pub struct AssetCatalogueItemSortInput {
    key: AssetCatalogueItemSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetCatalogueItemFilterInput {
    pub id: Option<EqualFilter<String>>,
    pub category: Option<StringFilter>,
    pub category_id: Option<EqualFilter<String>>,
    pub class: Option<StringFilter>,
    pub class_id: Option<EqualFilter<String>>,
    pub code: Option<StringFilter>,
    pub manufacturer: Option<StringFilter>,
    pub model: Option<StringFilter>,
    pub r#type: Option<StringFilter>,
    pub type_id: Option<EqualFilter<String>>,
}

impl From<AssetCatalogueItemFilterInput> for AssetCatalogueItemFilter {
    fn from(f: AssetCatalogueItemFilterInput) -> Self {
        AssetCatalogueItemFilter {
            id: f.id.map(EqualFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
            category: f.category.map(StringFilter::from),
            class: f.class.map(StringFilter::from),
            class_id: f.class_id.map(EqualFilter::from),
            code: f.code.map(StringFilter::from),
            manufacturer: f.manufacturer.map(StringFilter::from),
            model: f.model.map(StringFilter::from),
            r#type: f.r#type.map(StringFilter::from),
            type_id: f.type_id.map(EqualFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueItemNode {
    pub asset_catalogue_item: AssetCatalogueItem,
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

    pub async fn code(&self) -> &str {
        &self.row().code
    }
    pub async fn manufacturer(&self) -> Option<String> {
        self.row().manufacturer.as_ref().map(|it| it.clone())
    }
    pub async fn model(&self) -> &str {
        &self.row().model
    }
    pub async fn asset_type_id(&self) -> &str {
        &self.row().type_id
    }
}

impl AssetCatalogueItemNode {
    pub fn from_domain(asset_catalogue_item: AssetCatalogueItem) -> AssetCatalogueItemNode {
        AssetCatalogueItemNode {
            asset_catalogue_item,
        }
    }

    pub fn row(&self) -> &AssetCatalogueItemRow {
        &self.asset_catalogue_item.asset_catalogue_item_row
    }
}

impl AssetCatalogueItemConnector {
    pub fn from_domain(
        asset_catalogue_items: ListResult<AssetCatalogueItem>,
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
