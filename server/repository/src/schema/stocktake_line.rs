use super::diesel_schema::stocktake_line;

use chrono::NaiveDate;

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "stocktake_line"]
pub struct StocktakeLineRow {
    pub id: String,
    pub stocktake_id: String,
    /// If missing, a new stock line needs to be created when finalizing the stocktake
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    /// Comment for this stocktake line
    pub comment: Option<String>,
    pub snapshot_number_of_packs: i32,
    pub counted_number_of_packs: Option<i32>,

    // stock line related fields:
    /// When a creating a new stock line this field holds the required item id
    pub item_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<i32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}
