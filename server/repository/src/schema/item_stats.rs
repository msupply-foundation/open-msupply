use chrono::{NaiveDate, NaiveDateTime};
use util::Defaults;

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ConsumptionRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i32,
    pub date: NaiveDate,
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct StockOnHandRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub available_stock_on_hand: i64,
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct StockMovementRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i32,
    pub datetime: NaiveDateTime,
}

impl Default for ConsumptionRow {
    fn default() -> Self {
        Self {
            date: Defaults::naive_date(),
            // Default
            id: Default::default(),
            item_id: Default::default(),
            store_id: Default::default(),
            quantity: Default::default(),
        }
    }
}

impl Default for StockMovementRow {
    fn default() -> Self {
        Self {
            datetime: Defaults::naive_date_time(),
            // Default
            id: Default::default(),
            item_id: Default::default(),
            store_id: Default::default(),
            quantity: Default::default(),
        }
    }
}
