use super::diesel_schema::transact_line;
use diesel_derive_enum::DbEnum;

#[derive(sqlx::Type)]
#[sqlx(rename = "transact_line_type")]
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
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

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "transact_line"]
pub struct TransactLineRow {
    pub id: String,
    pub transact_id: String,
    pub item_id: String,
    pub item_line_id: Option<String>,
    pub type_of: TransactLineRowType,
}
