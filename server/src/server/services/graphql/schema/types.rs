//! src/services/graphql/schema/types.rs

use juniper::{GraphQLInputObject, GraphQLObject};

#[derive(Clone, GraphQLObject)]
// An item.
pub struct Item {
    pub id: String,
    pub name: String,
}

#[derive(Clone, GraphQLObject)]
// An item line.
pub struct ItemLine {
    pub id: String,
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
    pub item_quantity: f64,
}

#[derive(Clone, GraphQLInputObject)]
// A input requisition line.
pub struct InputRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub item_quantity: f64,
}
