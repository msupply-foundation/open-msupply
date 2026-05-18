use std::str::FromStr;

use serde::{Deserialize, Serialize};

// Discriminant for `property.type`. Stored as a TEXT column so we can keep one
// schema for both SQLite and Postgres without managing a Postgres enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyType {
    Text,
    Date,
    Real,
    Number,
    Option,
}

impl PropertyType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PropertyType::Text => "text",
            PropertyType::Date => "date",
            PropertyType::Real => "real",
            PropertyType::Number => "number",
            PropertyType::Option => "option",
        }
    }
}

impl FromStr for PropertyType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "text" => Ok(PropertyType::Text),
            "date" => Ok(PropertyType::Date),
            "real" => Ok(PropertyType::Real),
            "number" => Ok(PropertyType::Number),
            "option" => Ok(PropertyType::Option),
            other => Err(format!("Unknown property type: {other}")),
        }
    }
}

// Parents that can carry properties. Property.table_name is also TEXT in the
// database so we can add new parents without a schema change; the enum is the
// service-layer guard that catches typos.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyParentTable {
    Item,
    Name,
    InvoiceLine,
}

impl PropertyParentTable {
    pub fn as_str(&self) -> &'static str {
        match self {
            PropertyParentTable::Item => "item",
            PropertyParentTable::Name => "name",
            PropertyParentTable::InvoiceLine => "invoice_line",
        }
    }
}

impl FromStr for PropertyParentTable {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "item" => Ok(PropertyParentTable::Item),
            "name" => Ok(PropertyParentTable::Name),
            "invoice_line" => Ok(PropertyParentTable::InvoiceLine),
            other => Err(format!("Unsupported property parent table: {other}")),
        }
    }
}
