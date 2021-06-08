//! src/utils/database/schema.rs

#[derive(Clone)]
pub struct NameRow {
    pub id: String,
    pub name: String,
}

#[derive(Clone)]
pub struct RequisitionRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
}

#[derive(Clone)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub item_quantity: f32,
}

#[derive(Clone)]
pub struct StoreRow {
    pub id: String,
    pub name_id: String,
}

#[derive(Clone)]
pub struct TransactRow {
    pub id: String,
    pub name_id: String,
    pub invoice_number: i32,
}

#[derive(Clone)]
pub struct TransLineRow {
    pub id: String,
    pub transaction_id: String,
    pub item_id: String,
    pub item_line_id: String,
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
    pub store_id: String,
    pub batch: String,
    pub quantity: f64,
}
