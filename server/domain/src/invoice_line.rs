use chrono::NaiveDate;

use crate::AddToFilter;

use super::{EqualFilter, Sort};
#[derive(Clone)]

pub struct InvoiceLine {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub invoice_id: String,
    pub location_id: Option<String>,
    pub location_name: Option<String>,
    pub item_id: String,
    pub item_name: String,
    pub item_code: String,
    pub pack_size: i32,
    pub number_of_packs: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub note: Option<String>,
}

pub struct InvoiceLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_id: Option<EqualFilter<String>>,
}

impl InvoiceLineFilter {
    pub fn new() -> InvoiceLineFilter {
        InvoiceLineFilter {
            id: None,
            invoice_id: None,
        }
    }

    pub fn id<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.id = self.id.add(f);
        self
    }

    pub fn invoice_id<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(
        mut self,
        f: F,
    ) -> Self {
        self.invoice_id = self.invoice_id.add(f);
        self
    }
}

pub type InvoiceLineSort = Sort<()>;
