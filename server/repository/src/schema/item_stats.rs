use chrono::NaiveDateTime;

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ConsumptionRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub consumption_quantity: i32,
    pub consumption_datetime: Option<NaiveDateTime>,
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct StockInfoRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub available_stock_on_hand: i64,
}
