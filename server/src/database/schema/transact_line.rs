use super::diesel_schema::transact_line;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum TransactLineRowType {
    StockOut,
    StockIn,
    Placeholder,
    CashIn,
    CashOut,
    NonStock,
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
