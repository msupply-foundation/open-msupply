use chrono::NaiveDate;

#[derive(Clone)]
pub struct StockLine {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub batch: Option<String>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub available_number_of_packs: i32,
    pub total_number_of_packs: i32,
    pub expiry_date: Option<NaiveDate>,
}
