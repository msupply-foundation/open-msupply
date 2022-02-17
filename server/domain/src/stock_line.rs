use chrono::NaiveDate;

use crate::DateFilter;

use super::{EqualFilter, Sort};

#[derive(Clone, PartialEq, Debug)]
pub struct StockLine {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub location_id: Option<String>,
    pub location_name: Option<String>,
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
#[derive(Debug)]
pub struct StockLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub expiry_date: Option<DateFilter>,
    pub store_id: Option<EqualFilter<String>>,
}

impl StockLineFilter {
    pub fn new() -> StockLineFilter {
        StockLineFilter {
            id: None,
            item_id: None,
            location_id: None,
            expiry_date: None,
            store_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }

    pub fn expiry_date(mut self, filter: DateFilter) -> Self {
        self.expiry_date = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}

pub type StockLineSort = Sort<()>;
