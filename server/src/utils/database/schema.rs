//! src/utils/database/schema.rs

#[derive(Clone)]
pub struct RequisitionRow {
    pub id: String,
    pub from_id: String,
    pub to_id: String,
}

#[derive(Clone)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_name: String,
    pub item_quantity: f32,
}
