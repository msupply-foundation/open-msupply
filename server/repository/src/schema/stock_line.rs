use super::diesel_schema::stock_line;

use chrono::NaiveDate;

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[table_name = "stock_line"]
pub struct StockLineRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub available_number_of_packs: i32,
    pub total_number_of_packs: i32,
    pub expiry_date: Option<NaiveDate>,
    pub on_hold: bool,
    pub note: Option<String>,
}
