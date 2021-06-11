//! src/utils/database/schema.rs

#[derive(Clone)]
pub struct NameRow {
    pub id: String,
    pub name: String,
}

#[derive(sqlx::Type)]
#[sqlx(rename = "requisition_type", rename_all = "lowercase")]
#[derive(Clone)]
pub enum RequisitionRowType {
    Request,
    Response,
}

#[derive(Clone)]
pub struct RequisitionRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub type_of: RequisitionRowType,
}

#[derive(Clone)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}

#[derive(Clone)]
pub struct StoreRow {
    pub id: String,
    pub name_id: String,
}

#[derive(sqlx::Type)]
#[sqlx(rename = "transact_type", rename_all = "lowercase")]
#[derive(Clone)]
pub enum TransactionRowType {
    CustomerInvoice,
    CustomerCredit,
    SupplierInvoice,
    SupplierCredit,
    Repack,
    Build,
    Receipt,
    Payment,
}

#[derive(Clone)]
pub struct TransactionRow {
    pub id: String,
    pub name_id: String,
    pub invoice_number: i32,
    pub type_of: TransactionRowType,
}

#[derive(Clone)]
pub struct TransactionLineRow {
    pub id: String,
    pub transaction_id: String,
    pub item_id: String,
    pub item_line_id: Option<String>,
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
