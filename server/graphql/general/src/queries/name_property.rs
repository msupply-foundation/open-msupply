// Legacy `nameProperties` query — kept as a no-op stub so the host client
// keeps compiling against the schema while the host UI migrates to the new
// property system. Returns an empty connector.

use async_graphql::*;

use graphql_types::types::PropertyNode;

pub fn name_properties() -> NamePropertyResponse {
    NamePropertyResponse::Response(NamePropertyConnector {
        total_count: 0,
        nodes: vec![],
    })
}

#[derive(Union)]
pub enum NamePropertyResponse {
    Response(NamePropertyConnector),
}

#[derive(SimpleObject)]
pub struct NamePropertyConnector {
    total_count: u32,
    nodes: Vec<NamePropertyNode>,
}

#[derive(PartialEq, Debug, Default)]
pub struct NamePropertyNode;

#[Object]
impl NamePropertyNode {
    pub async fn id(&self) -> String {
        String::new()
    }
    pub async fn remote_editable(&self) -> bool {
        false
    }
    pub async fn property(&self) -> Option<PropertyNode> {
        None
    }
}
