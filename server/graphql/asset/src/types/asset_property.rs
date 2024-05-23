use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;

use graphql_core::simple_generic_errors::NodeError;

use repository::assets::asset_property::AssetPropertyFilter;
use repository::db_diesel::assets::asset_property_row::AssetPropertyRow;

use repository::EqualFilter;
use service::ListResult;

#[derive(InputObject, Clone)]
pub struct AssetPropertyFilterInput {
    pub id: Option<EqualFilterStringInput>,
}

impl From<AssetPropertyFilterInput> for AssetPropertyFilter {
    fn from(f: AssetPropertyFilterInput) -> Self {
        AssetPropertyFilter {
            id: f.id.map(EqualFilter::from),
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
    //TODO: Add more fields here
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
