//! src/services/graphql/schema/types.rs

use juniper::{GraphQLInputObject, GraphQLObject};

#[derive(Clone, GraphQLObject)]
// A name.
pub struct Name {
    pub id: String,
    pub name: String,
}

#[derive(Clone, GraphQLObject)]
// A store.
pub struct Store {
    pub id: String,
    pub name: Name,
}

#[derive(Clone, GraphQLObject)]
// An item.
pub struct Item {
    pub id: String,
    pub item_name: String,
}

#[derive(Clone, GraphQLObject)]
// An item line.
pub struct ItemLine {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub batch: String,
    pub quantity: f64,
}

#[derive(Clone, GraphQLObject)]
// A requisition.
pub struct Requisition {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub requisition_lines: Vec<RequisitionLine>,
}

#[derive(Clone, GraphQLObject)]
// A requisition line.
pub struct RequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}

#[derive(Clone, GraphQLInputObject)]
// A input requisition line.
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
