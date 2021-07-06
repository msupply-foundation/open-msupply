#[derive(sqlx::Type)]
#[sqlx(rename = "transact_line_type")]
#[derive(Clone, PartialEq, Eq)]
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
    Service,
}

#[derive(Clone)]
pub struct TransactLineRow {
    pub id: String,
    pub transact_id: String,
    pub item_id: String,
    pub item_line_id: Option<String>,
    pub type_of: TransactLineRowType,
}
