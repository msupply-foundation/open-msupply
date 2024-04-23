use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;

use repository::{
    asset_catalogue_property_row::PropertyValueType,
    assets::asset_catalogue_property_row::AssetCataloguePropertyRow,
};
use serde::Serialize;
use service::ListResult;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum PropertyNodeValueType {
    String,
    Boolean,
    Integer,
    Float,
}

impl PropertyNodeValueType {
    pub fn from_domain(value_type: &PropertyValueType) -> PropertyNodeValueType {
        use PropertyValueType::*;
        match value_type {
            String => PropertyNodeValueType::String,
            Boolean => PropertyNodeValueType::Boolean,
            Integer => PropertyNodeValueType::Integer,
            Float => PropertyNodeValueType::Float,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetCataloguePropertyNode {
    pub asset_catalogue_property: AssetCataloguePropertyRow,
}

#[derive(SimpleObject)]

pub struct AssetCataloguePropertyConnector {
    total_count: u32,
    nodes: Vec<AssetCataloguePropertyNode>,
}

#[Object]
impl AssetCataloguePropertyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn category_id(&self) -> &str {
        &self.row().category_id
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::from_domain(&self.row().value_type)
    }
    pub async fn allowed_values(&self) -> &Option<String> {
        &self.row().allowed_values
    }
}

#[derive(Union)]
pub enum AssetCataloguePropertyResponse {
    Error(NodeError),
    Response(AssetCataloguePropertyConnector),
}

impl AssetCataloguePropertyNode {
    pub fn from_domain(
        asset_catalogue_property: AssetCataloguePropertyRow,
    ) -> AssetCataloguePropertyNode {
        AssetCataloguePropertyNode {
            asset_catalogue_property,
        }
    }
    pub fn row(&self) -> &AssetCataloguePropertyRow {
        &self.asset_catalogue_property
    }
}

impl AssetCataloguePropertyConnector {
    pub fn from_domain(
        asset_types: ListResult<AssetCataloguePropertyRow>,
    ) -> AssetCataloguePropertyConnector {
        AssetCataloguePropertyConnector {
            total_count: asset_types.count,
            nodes: asset_types
                .rows
                .into_iter()
                .map(AssetCataloguePropertyNode::from_domain)
                .collect(),
        }
    }
}
