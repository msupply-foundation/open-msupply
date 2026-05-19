use async_graphql::*;
use chrono::NaiveDate;
use repository::{
    PropertyRow, PropertyV2OptionRow, PropertyV2OptionRowRepository, PropertyV2ParentTable,
    PropertyV2Row, PropertyV2TableRow, PropertyV2TableRowRepository, PropertyV2Type,
};
use serde::Serialize;
use service::property_v2::PropertyV2ValueWithProperty;

use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

// Legacy enum used by both the asset_property and name_property surfaces.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::assets::types::PropertyValueType")]
pub enum PropertyNodeValueType {
    String,
    Boolean,
    Integer,
    Float,
    Date,
}

// ---------------------------------------------------------------------------
// Legacy PropertyNode (matches the original `property` table — key,
// value_type, allowed_values).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// V2 (KDD prototype) GraphQL types
// ---------------------------------------------------------------------------

// Discriminant for the new property system. Mirrors `repository::PropertyV2Type`.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyV2TypeEnum {
    Text,
    Number,
    Real,
    Date,
    Option,
}

impl From<PropertyV2Type> for PropertyV2TypeEnum {
    fn from(t: PropertyV2Type) -> Self {
        match t {
            PropertyV2Type::Text => PropertyV2TypeEnum::Text,
            PropertyV2Type::Number => PropertyV2TypeEnum::Number,
            PropertyV2Type::Real => PropertyV2TypeEnum::Real,
            PropertyV2Type::Date => PropertyV2TypeEnum::Date,
            PropertyV2Type::Option => PropertyV2TypeEnum::Option,
        }
    }
}

impl From<PropertyV2TypeEnum> for PropertyV2Type {
    fn from(t: PropertyV2TypeEnum) -> Self {
        match t {
            PropertyV2TypeEnum::Text => PropertyV2Type::Text,
            PropertyV2TypeEnum::Number => PropertyV2Type::Number,
            PropertyV2TypeEnum::Real => PropertyV2Type::Real,
            PropertyV2TypeEnum::Date => PropertyV2Type::Date,
            PropertyV2TypeEnum::Option => PropertyV2Type::Option,
        }
    }
}

// Parents that can carry a V2 property. Mirrors `repository::PropertyV2ParentTable`.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyV2ParentTableEnum {
    Name,
    Item,
    InvoiceLine,
}

impl From<PropertyV2ParentTable> for PropertyV2ParentTableEnum {
    fn from(t: PropertyV2ParentTable) -> Self {
        match t {
            PropertyV2ParentTable::Name => PropertyV2ParentTableEnum::Name,
            PropertyV2ParentTable::Item => PropertyV2ParentTableEnum::Item,
            PropertyV2ParentTable::InvoiceLine => PropertyV2ParentTableEnum::InvoiceLine,
        }
    }
}

impl From<PropertyV2ParentTableEnum> for PropertyV2ParentTable {
    fn from(t: PropertyV2ParentTableEnum) -> Self {
        match t {
            PropertyV2ParentTableEnum::Name => PropertyV2ParentTable::Name,
            PropertyV2ParentTableEnum::Item => PropertyV2ParentTable::Item,
            PropertyV2ParentTableEnum::InvoiceLine => PropertyV2ParentTable::InvoiceLine,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyV2Node {
    property: PropertyV2Row,
}

#[Object]
impl PropertyV2Node {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn r#type(&self) -> Result<PropertyV2TypeEnum> {
        self.row()
            .r#type
            .parse::<PropertyV2Type>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }

    pub async fn translation_key(&self) -> &Option<String> {
        &self.row().translation_key
    }

    // All options for this property, including soft-deleted ones, so the UI
    // can resolve previously-selected option names even after they are removed
    // from the configuration.
    pub async fn options(&self, ctx: &Context<'_>) -> Result<Vec<PropertyV2OptionNode>> {
        let connection = ctx.get_connection_manager().connection()?;
        let rows = PropertyV2OptionRowRepository::new(&connection)
            .find_by_property_id(&self.row().id, true)?;
        Ok(rows
            .into_iter()
            .map(PropertyV2OptionNode::from_domain)
            .collect())
    }

    pub async fn attached_to(&self, ctx: &Context<'_>) -> Result<Vec<PropertyV2TableNode>> {
        let connection = ctx.get_connection_manager().connection()?;
        let rows =
            PropertyV2TableRowRepository::new(&connection).find_by_property_id(&self.row().id)?;
        Ok(rows
            .into_iter()
            .map(PropertyV2TableNode::from_domain)
            .collect())
    }
}

impl PropertyV2Node {
    pub fn from_domain(property: PropertyV2Row) -> PropertyV2Node {
        PropertyV2Node { property }
    }

    pub fn row(&self) -> &PropertyV2Row {
        &self.property
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyV2OptionNode {
    option: PropertyV2OptionRow,
}

#[Object]
impl PropertyV2OptionNode {
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

impl PropertyV2OptionNode {
    pub fn from_domain(option: PropertyV2OptionRow) -> Self {
        PropertyV2OptionNode { option }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyV2TableNode {
    row: PropertyV2TableRow,
}

#[Object]
impl PropertyV2TableNode {
    pub async fn id(&self) -> &str {
        &self.row.id
    }
    pub async fn property_id(&self) -> &str {
        &self.row.property_id
    }
    pub async fn table(&self) -> Result<PropertyV2ParentTableEnum> {
        self.row
            .table_name
            .parse::<PropertyV2ParentTable>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }
}

impl PropertyV2TableNode {
    pub fn from_domain(row: PropertyV2TableRow) -> Self {
        PropertyV2TableNode { row }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyV2ValueNode {
    inner: PropertyV2ValueWithProperty,
}

#[Object]
impl PropertyV2ValueNode {
    pub async fn id(&self) -> &str {
        &self.inner.value.id
    }

    pub async fn record_id(&self) -> &str {
        &self.inner.value.record_id
    }

    pub async fn parent_table(&self) -> Result<PropertyV2ParentTableEnum> {
        self.inner
            .value
            .table_name
            .parse::<PropertyV2ParentTable>()
            .map(Into::into)
            .map_err(|e| StandardGraphqlError::InternalError(e).extend())
    }

    pub async fn property(&self) -> PropertyV2Node {
        PropertyV2Node::from_domain(self.inner.property.clone())
    }

    pub async fn option(&self) -> Option<PropertyV2OptionNode> {
        self.inner
            .option
            .clone()
            .map(PropertyV2OptionNode::from_domain)
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

impl PropertyV2ValueNode {
    pub fn from_domain(inner: PropertyV2ValueWithProperty) -> Self {
        PropertyV2ValueNode { inner }
    }

    pub fn from_vec(values: Vec<PropertyV2ValueWithProperty>) -> Vec<Self> {
        values.into_iter().map(Self::from_domain).collect()
    }
}
