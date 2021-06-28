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
