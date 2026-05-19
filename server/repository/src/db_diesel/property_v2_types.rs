use std::str::FromStr;

use serde::{Deserialize, Serialize};

// Discriminant for `property_v2.type`. Stored as a TEXT column so we can keep
// one schema for both SQLite and Postgres without managing a Postgres enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyV2Type {
    Text,
    Date,
    Real,
    Number,
    Option,
}

impl PropertyV2Type {
    pub fn as_str(&self) -> &'static str {
        match self {
            PropertyV2Type::Text => "text",
            PropertyV2Type::Date => "date",
            PropertyV2Type::Real => "real",
            PropertyV2Type::Number => "number",
            PropertyV2Type::Option => "option",
        }
    }
}

impl FromStr for PropertyV2Type {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "text" => Ok(PropertyV2Type::Text),
            "date" => Ok(PropertyV2Type::Date),
            "real" => Ok(PropertyV2Type::Real),
            "number" => Ok(PropertyV2Type::Number),
            "option" => Ok(PropertyV2Type::Option),
            other => Err(format!("Unknown property type: {other}")),
        }
    }
}

// Parents that can carry properties. property_v2_table.table_name is also TEXT
// in the database so we can add new parents without a schema change; the enum
// is the service-layer guard that catches typos.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyV2ParentTable {
    Item,
    Name,
    InvoiceLine,
}

impl PropertyV2ParentTable {
    pub fn as_str(&self) -> &'static str {
        match self {
            PropertyV2ParentTable::Item => "item",
            PropertyV2ParentTable::Name => "name",
            PropertyV2ParentTable::InvoiceLine => "invoice_line",
        }
    }
}

impl FromStr for PropertyV2ParentTable {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "item" => Ok(PropertyV2ParentTable::Item),
            "name" => Ok(PropertyV2ParentTable::Name),
            "invoice_line" => Ok(PropertyV2ParentTable::InvoiceLine),
            other => Err(format!("Unsupported property parent table: {other}")),
        }
    }
}
