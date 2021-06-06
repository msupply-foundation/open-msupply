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

#[derive(Clone)]
pub struct ItemRow {
    pub id: String,
    pub item_name: String,
}

#[derive(Clone)]
pub struct ItemLineRow {
    pub id: String,
    pub item_id: String,
    pub batch: String,
    pub quantity: f32,
}
