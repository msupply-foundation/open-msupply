use chrono::NaiveDate;

use super::{EqualFilter, Sort};

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
    pub on_hold: bool,
    pub note: Option<String>,
}

pub struct StockLineFilter {
    pub id: Option<EqualFilter<String>>,
}

impl StockLineFilter {
    pub fn new() -> StockLineFilter {
        StockLineFilter { id: None }
    }

    pub fn match_id(mut self, id: &str) -> Self {
        self.id = Some(EqualFilter {
            equal_to: Some(id.to_owned()),
            equal_any: None,
        });

        self
    }
}

pub type StockLineSort = Sort<()>;
