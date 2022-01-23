use super::diesel_schema::stock_take;
use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StockTakeStatus {
    New,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "stock_take"]
pub struct StockTakeRow {
    pub id: String,
    pub store_id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: StockTakeStatus,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    /// reference to the inventory adjustment shipment
    pub inventory_adjustment_id: Option<String>,
}
