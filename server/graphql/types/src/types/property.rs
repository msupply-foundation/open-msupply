use async_graphql::*;
use repository::{types::PropertyValueType, PropertyRow};
use serde::Serialize;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::assets::types
::PropertyValueType")]
pub enum PropertyNodeValueType {
    String,
    Boolean,
    Integer,
    Float,
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
    pub async fn key(&self) -> &str {
        &self.row().key
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::from(self.row().value_type.clone())
    }
    /// If `valueType` is `String`, this field can contain a comma-separated
    /// list of allowed values, essentially defining an enum.
    /// If `valueType` is Integer or Float, this field will include the
    /// word `negative` if negative values are allowed.
    pub async fn allowed_values(&self) -> &Option<String> {
        &self.row().allowed_values
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
