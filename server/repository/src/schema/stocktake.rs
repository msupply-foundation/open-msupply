use super::diesel_schema::stocktake;
use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use util::Defaults;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StocktakeStatus {
    New,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "stocktake"]
pub struct StocktakeRow {
    pub id: String,
    pub store_id: String,
    pub stocktake_number: i64,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: StocktakeStatus,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    /// reference to the inventory adjustment shipment
    pub inventory_adjustment_id: Option<String>,
    pub is_locked: bool,
}

impl Default for StocktakeStatus {
    fn default() -> Self {
        Self::New
    }
}

impl Default for StocktakeRow {
    fn default() -> Self {
        Self {
            created_datetime: Defaults::naive_date_time(),
            status: Default::default(),
            // Defaults
            id: Default::default(),
            store_id: Default::default(),
            stocktake_number: Default::default(),
            comment: Default::default(),
            description: Default::default(),
            finalised_datetime: Default::default(),
            inventory_adjustment_id: Default::default(),
            is_locked: Default::default(),
        }
    }
}
