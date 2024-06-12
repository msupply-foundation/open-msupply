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
