//! src/graphql/schema.rs

use juniper::{GraphQLInputObject, GraphQLObject};

#[derive(Clone, GraphQLObject)]
// A requisition.
pub struct Requisition {
    pub id: String,
    pub from_id: String,
    pub to_id: String,
    pub requisition_lines: Vec<RequisitionLine>,
}

#[derive(Clone, GraphQLObject)]
// A requisition line.
pub struct RequisitionLine {
    pub id: String,
    pub item_name: String,
    pub item_quantity: f64,
}

#[derive(Clone, GraphQLInputObject)]
// A input requisition line.
pub struct InputRequisitionLine {
    pub id: String,
    pub item_name: String,
    pub item_quantity: f64,
}
