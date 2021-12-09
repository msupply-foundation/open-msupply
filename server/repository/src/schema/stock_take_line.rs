use super::diesel_schema::stock_take_line;

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "stock_take_line"]
pub struct StockTakeLineRow {
    pub id: String,
    pub stock_take_id: String,
    pub stock_line_id: String,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub comment: Option<String>,
    pub cost_price_pack: f64,
    pub sell_price_pack: f64,
    pub snapshot_number_of_packs: i32,
    pub counted_number_of_packs: i32,
}
