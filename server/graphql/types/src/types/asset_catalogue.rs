use super::StockLineConnector;
use async_graphql::*;
use async_graphql::{dataloader::DataLoader, Context};
use graphql_core::generic_filters::{EqualFilterStringInput, StringFilterInput};
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::{loader::StockLineByLocationIdLoader, ContextExt};
use repository::StringFilter;
use repository::{
    location::{Location, LocationFilter, LocationSort, LocationSortField},
    EqualFilter, LocationRow,
};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum AssetCatalogueSortFieldInput {
    Catalogue,
    Category,
    Class,
    Code,
    Make,
    Model,
    Type,
}
#[derive(InputObject)]
pub struct AssetCatalogueSortInput {
    /// Sort query result by `key`
    key: AssetCatalogueSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetCatalogueFilterInput {
    pub category: Option<StringFilterInput>,
    pub class: Option<StringFilterInput>,
    pub code: Option<StringFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub make: Option<StringFilterInput>,
    pub model: Option<StringFilterInput>,
    pub r#type: Option<StringFilterInput>,
}

impl From<AssetCatalogueFilterInput> for AssetCatalogueFilter {
    fn from(f: AssetCatalogueFilterInput) -> Self {
        AssetCatalogueFilter {
            category: f.category.map(StringFilter::from),
            class: f.class.map(StringFilter::from),
            code: f.code.map(StringFilter::from),
            id: f.id.map(EqualFilter::from),
            make: f.make.map(StringFilter::from),
            model: f.model.map(StringFilter::from),
            store_id: None,
            r#type: f.r#type.map(StringFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueNode {
    pub asset_catalogue: AssetCatalogue,
}

#[derive(SimpleObject)]
pub struct AssetCatalogueConnector {
    total_count: u32,
    nodes: Vec<AssetCatalogueNode>,
}

#[Object]
impl AssetCatalogueNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn category(&self) -> &str {
        &self.row().category
    }

    pub async fn class(&self) -> &str {
        &self.row().class
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn make(&self) -> &str {
        &self.row().make
    }

    pub async fn model(&self) -> &str {
        &self.row().model
    }

    pub async fn r#type(&self) -> &str {
        &self.row().r#type
    }
}

#[derive(Union)]
pub enum AssetCataloguesResponse {
    Response(AssetCatalogueConnector),
}

#[derive(Union)]
pub enum AssetCatalogueResponse {
    Error(NodeError),
    Response(AssetCatalogueNode),
}

impl AssetCatalogueNode {
    pub fn from_domain(asset_catalogue: AssetCatalogue) -> AssetCatalogueNode {
        AssetCatalogueNode { asset_catalogue }
    }

    pub fn row(&self) -> &AssetCatalogueRow {
        &self.asset_catalogue.asset_catalogue_row
    }
}

impl AssetCatalogueConnector {
    pub fn from_domain(asset_catalogues: ListResult<AssetCatalogue>) -> AssetCatalogueConnector {
        AssetCatalogueConnector {
            total_count: asset_catalogues.count,
            nodes: asset_catalogues
                .rows
                .into_iter()
                .map(AssetCatalogueNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(asset_catalogues: Vec<AssetCatalogue>) -> AssetCatalogueConnector {
        AssetCatalogueConnector {
            total_count: usize_to_u32(asset_catalogues.len()),
            nodes: asset_catalogues
                .into_iter()
                .map(AssetCatalogueNode::from_domain)
                .collect(),
        }
    }
}

impl AssetCatalogueSortInput {
    pub fn to_domain(self) -> AssetCatalogueSort {
        use AssetCatalogueSortField as to;
        use AssetCatalogueSortFieldInput as from;
        let key = match self.key {
            from::Catalogue => to::Catalogue,
            from::Category => to::Category,
            from::Class => to::Class,
            from::Code => to::Code,
            from::Make => to::Make,
            from::Model => to::Model,
            from::Type => to::Type,
        };

        AssetCatalogueSort {
            key,
            desc: self.desc,
        }
    }
}
