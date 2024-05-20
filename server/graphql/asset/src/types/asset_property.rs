use async_graphql::*;
use graphql_asset_catalogue::types::asset_catalogue_property::PropertyNodeValueType;
use graphql_core::generic_filters::{EqualFilterStringInput, StringFilterInput};

use graphql_core::simple_generic_errors::NodeError;

use repository::assets::asset_property::AssetPropertyFilter;
use repository::db_diesel::assets::asset_property_row::AssetPropertyRow;

use repository::{EqualFilter, StringFilter};
use service::ListResult;

#[derive(InputObject, Clone)]
pub struct AssetPropertyFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub key: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub asset_class_id: Option<EqualFilterStringInput>,
    pub asset_category_id: Option<EqualFilterStringInput>,
    pub asset_type_id: Option<EqualFilterStringInput>,
}

impl From<AssetPropertyFilterInput> for AssetPropertyFilter {
    fn from(f: AssetPropertyFilterInput) -> Self {
        AssetPropertyFilter {
            id: f.id.map(EqualFilter::from),
            key: f.key.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            asset_class_id: f.asset_class_id.map(EqualFilter::from),
            asset_category_id: f.asset_category_id.map(EqualFilter::from),
            asset_type_id: f.asset_type_id.map(EqualFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct AssetPropertyNode {
    pub asset_property: AssetPropertyRow,
}

#[derive(SimpleObject)]
pub struct AssetPropertyConnector {
    total_count: u32,
    nodes: Vec<AssetPropertyNode>,
}

#[Object]
impl AssetPropertyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn key(&self) -> &str {
        &self.row().key
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn asset_class_id(&self) -> Option<String> {
        self.row().asset_class_id.clone()
    }
    pub async fn asset_category_id(&self) -> Option<String> {
        self.row().asset_category_id.clone()
    }
    pub async fn asset_type_id(&self) -> Option<String> {
        self.row().asset_type_id.clone()
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::from_domain(&self.row().value_type)
    }
    pub async fn allowed_values(&self) -> &Option<String> {
        &self.row().allowed_values
    }
}

#[derive(Union)]
pub enum AssetPropertiesResponse {
    Response(AssetPropertyConnector),
}

#[derive(Union)]
pub enum AssetPropertyResponse {
    Error(NodeError),
    Response(AssetPropertyNode),
}

impl AssetPropertyNode {
    pub fn from_domain(asset_property: AssetPropertyRow) -> AssetPropertyNode {
        AssetPropertyNode { asset_property }
    }

    pub fn row(&self) -> &AssetPropertyRow {
        &self.asset_property
    }
}

impl AssetPropertyConnector {
    pub fn from_domain(assets: ListResult<AssetPropertyRow>) -> AssetPropertyConnector {
        AssetPropertyConnector {
            total_count: assets.count,
            nodes: assets
                .rows
                .into_iter()
                .map(AssetPropertyNode::from_domain)
                .collect(),
        }
    }
}
