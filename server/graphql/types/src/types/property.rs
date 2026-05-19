use async_graphql::*;
use chrono::NaiveDate;
use repository::{
    PropertyOptionRow, PropertyOptionRowRepository, PropertyParentTable, PropertyRow,
    PropertyTableRow, PropertyTableRowRepository, PropertyType,
};
use serde::Serialize;
use service::property::PropertyValueWithProperty;

use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

// Kept for the asset GraphQL surface, which still uses the legacy
// PropertyValueType on asset_property. The new `property` system uses
// PropertyTypeEnum (see below).
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

// Discriminant for the new property system. Mirrors `repository::PropertyType`.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyTypeEnum {
    Text,
    Number,
    Real,
    Date,
    Option,
}

impl From<PropertyType> for PropertyTypeEnum {
    fn from(t: PropertyType) -> Self {
        match t {
            PropertyType::Text => PropertyTypeEnum::Text,
            PropertyType::Number => PropertyTypeEnum::Number,
            PropertyType::Real => PropertyTypeEnum::Real,
            PropertyType::Date => PropertyTypeEnum::Date,
            PropertyType::Option => PropertyTypeEnum::Option,
        }
    }
}

impl From<PropertyTypeEnum> for PropertyType {
    fn from(t: PropertyTypeEnum) -> Self {
        match t {
            PropertyTypeEnum::Text => PropertyType::Text,
            PropertyTypeEnum::Number => PropertyType::Number,
            PropertyTypeEnum::Real => PropertyType::Real,
            PropertyTypeEnum::Date => PropertyType::Date,
            PropertyTypeEnum::Option => PropertyType::Option,
        }
    }
}

// Parents that can carry a property. Mirrors `repository::PropertyParentTable`.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyParentTableEnum {
    Name,
    Item,
    InvoiceLine,
}

impl From<PropertyParentTable> for PropertyParentTableEnum {
    fn from(t: PropertyParentTable) -> Self {
        match t {
            PropertyParentTable::Name => PropertyParentTableEnum::Name,
            PropertyParentTable::Item => PropertyParentTableEnum::Item,
            PropertyParentTable::InvoiceLine => PropertyParentTableEnum::InvoiceLine,
        }
    }
}

impl From<PropertyParentTableEnum> for PropertyParentTable {
    fn from(t: PropertyParentTableEnum) -> Self {
        match t {
            PropertyParentTableEnum::Name => PropertyParentTable::Name,
            PropertyParentTableEnum::Item => PropertyParentTable::Item,
            PropertyParentTableEnum::InvoiceLine => PropertyParentTable::InvoiceLine,
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

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn r#type(&self) -> Result<PropertyTypeEnum> {
        self.row()
            .r#type
            .parse::<PropertyType>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }

    pub async fn translation_key(&self) -> &Option<String> {
        &self.row().translation_key
    }

    // ---- Legacy compatibility shims ----
    // The prototype removed the legacy `name_property` system but client code
    // still references these fields via the `nameProperties` query path. They
    // return defaults rather than 'NotFound' so the host UI keeps compiling
    // without rewriting (deferred separately).
    pub async fn key(&self) -> &str {
        &self.row().id
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::String
    }
    pub async fn allowed_values(&self) -> Option<String> {
        None
    }

    // All options for this property, including soft-deleted ones, so the UI
    // can resolve previously-selected option names even after they are removed
    // from the configuration.
    pub async fn options(&self, ctx: &Context<'_>) -> Result<Vec<PropertyOptionNode>> {
        let connection = ctx.get_connection_manager().connection()?;
        let rows =
            PropertyOptionRowRepository::new(&connection).find_by_property_id(&self.row().id, true)?;
        Ok(rows.into_iter().map(PropertyOptionNode::from_domain).collect())
    }

    pub async fn attached_to(&self, ctx: &Context<'_>) -> Result<Vec<PropertyTableNode>> {
        let connection = ctx.get_connection_manager().connection()?;
        let rows = PropertyTableRowRepository::new(&connection).find_by_property_id(&self.row().id)?;
        Ok(rows.into_iter().map(PropertyTableNode::from_domain).collect())
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

#[derive(PartialEq, Debug)]
pub struct PropertyOptionNode {
    option: PropertyOptionRow,
}

#[Object]
impl PropertyOptionNode {
    pub async fn id(&self) -> &str {
        &self.option.id
    }
    pub async fn property_id(&self) -> &str {
        &self.option.property_id
    }
    pub async fn name(&self) -> &str {
        &self.option.name
    }
    pub async fn translation_key(&self) -> &Option<String> {
        &self.option.translation_key
    }
    pub async fn is_deleted(&self) -> bool {
        self.option.deleted_datetime.is_some()
    }
}

impl PropertyOptionNode {
    pub fn from_domain(option: PropertyOptionRow) -> Self {
        PropertyOptionNode { option }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyTableNode {
    row: PropertyTableRow,
}

#[Object]
impl PropertyTableNode {
    pub async fn id(&self) -> &str {
        &self.row.id
    }
    pub async fn property_id(&self) -> &str {
        &self.row.property_id
    }
    pub async fn table(&self) -> Result<PropertyParentTableEnum> {
        self.row
            .table_name
            .parse::<PropertyParentTable>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }
}

impl PropertyTableNode {
    pub fn from_domain(row: PropertyTableRow) -> Self {
        PropertyTableNode { row }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyValueNode {
    inner: PropertyValueWithProperty,
}

#[Object]
impl PropertyValueNode {
    pub async fn id(&self) -> &str {
        &self.inner.value.id
    }

    pub async fn record_id(&self) -> &str {
        &self.inner.value.record_id
    }

    pub async fn parent_table(&self) -> Result<PropertyParentTableEnum> {
        self.inner
            .value
            .table_name
            .parse::<PropertyParentTable>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }

    pub async fn property(&self) -> PropertyNode {
        PropertyNode::from_domain(self.inner.property.clone())
    }

    pub async fn option(&self) -> Option<PropertyOptionNode> {
        self.inner
            .option
            .clone()
            .map(PropertyOptionNode::from_domain)
    }

    pub async fn value_text(&self) -> &Option<String> {
        &self.inner.value.value_text
    }

    pub async fn value_number(&self) -> Option<i32> {
        self.inner.value.value_number
    }

    pub async fn value_real(&self) -> Option<f64> {
        self.inner.value.value_real
    }

    pub async fn value_date(&self) -> Option<NaiveDate> {
        self.inner.value.value_date
    }
}

impl PropertyValueNode {
    pub fn from_domain(inner: PropertyValueWithProperty) -> Self {
        PropertyValueNode { inner }
    }

    pub fn from_vec(values: Vec<PropertyValueWithProperty>) -> Vec<Self> {
        values.into_iter().map(Self::from_domain).collect()
    }
}
