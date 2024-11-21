use async_graphql::*;
use repository::{types::PropertyValueType, PropertyRow};
use serde::Serialize;

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
    pub fn to_domain(value_type: &PropertyNodeValueType) -> PropertyValueType {
        use PropertyNodeValueType::*;
        match value_type {
            String => PropertyValueType::String,
            Boolean => PropertyValueType::Boolean,
            Integer => PropertyValueType::Integer,
            Float => PropertyValueType::Float,
        }
    }
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
        PropertyNodeValueType::from_domain(&self.row().value_type)
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
