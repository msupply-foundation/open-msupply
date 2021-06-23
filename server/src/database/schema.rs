#[derive(Clone)]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}

#[derive(Clone)]
pub struct NameRow {
    pub id: String,
    pub name: String,
}

#[derive(sqlx::Type)]
#[sqlx(rename = "requisition_type", rename_all = "lowercase")]
#[derive(Clone)]
pub enum RequisitionRowType {
    Imprest,
    StockHistory,
    Request,
    Response,
    Supply,
    Report,
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
pub enum TransactRowType {
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
pub struct TransactRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub invoice_number: i32,
    pub type_of: TransactRowType,
}

#[derive(Clone)]
pub struct TransactLineRow {
    pub id: String,
    pub transact_id: String,
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
