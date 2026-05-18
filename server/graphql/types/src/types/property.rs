use async_graphql::*;
use repository::PropertyRow;
use serde::Serialize;

// Kept for the asset GraphQL surface, which still uses the legacy
// PropertyValueType on asset_property. The new `property` system uses a
// plain string (see PropertyNode::r#type).
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(remote = "repository::db_diesel::assets::types::PropertyValueType")]
pub enum PropertyNodeValueType {
    String,
    Boolean,
    Integer,
    Float,
    Date,
}

#[derive(PartialEq, Debug)]
pub struct PropertyNode {
    property: PropertyRow,
}

#[Object]
impl PropertyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    // Raw property type string ('text' | 'date' | 'real' | 'number' | 'option').
    // Returning a plain string keeps the GraphQL stub minimal while the
    // properties-KDD prototype is in flight.
    pub async fn r#type(&self) -> &str {
        &self.row().r#type
    }
    pub async fn translation_key(&self) -> &Option<String> {
        &self.row().translation_key
    }
}

impl PropertyNode {
    pub fn from_domain(property: PropertyRow) -> PropertyNode {
        PropertyNode { property }
    }

    pub fn row(&self) -> &PropertyRow {
        &self.property
    }
}
