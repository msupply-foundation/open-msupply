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
#[sqlx(rename = "requisition_type")]
#[derive(Clone)]
pub enum RequisitionRowType {
    #[sqlx(rename = "imprest")]
    Imprest,
    #[sqlx(rename = "stock_history")]
    StockHistory,
    #[sqlx(rename = "request")]
    Request,
    #[sqlx(rename = "response")]
    Response,
    #[sqlx(rename = "supply")]
    Supply,
    #[sqlx(rename = "report")]
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
#[sqlx(rename = "transact_type")]
#[derive(Clone)]
pub enum TransactRowType {
    #[sqlx(rename = "customer_invoice")]
    CustomerInvoice,
    #[sqlx(rename = "customer_credit")]
    CustomerCredit,
    #[sqlx(rename = "supplier_invoice")]
    SupplierInvoice,
    #[sqlx(rename = "supplier_credit")]
    SupplierCredit,
    #[sqlx(rename = "repack")]
    Repack,
    #[sqlx(rename = "build")]
    Build,
    #[sqlx(rename = "receipt")]
    Receipt,
    #[sqlx(rename = "payment")]
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

#[derive(sqlx::Type)]
#[sqlx(rename = "transact_line_type")]
#[derive(Clone)]
pub enum TransactLineRowType {
    #[sqlx(rename = "stock_out")]
    StockOut,
    #[sqlx(rename = "stock_in")]
    StockIn,
    #[sqlx(rename = "placeholder")]
    Placeholder,
    #[sqlx(rename = "cash_in")]
    CashIn,
    #[sqlx(rename = "cash_out")]
    CashOut,
    #[sqlx(rename = "non_stock")]
    NonStock,
    #[sqlx(rename = "service")]
    Service
}

#[derive(Clone)]
pub struct TransactLineRow {
    pub id: String,
    pub transact_id: String,
    pub item_id: String,
    pub item_line_id: Option<String>,
    pub type_of: TransactLineRowType,
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
