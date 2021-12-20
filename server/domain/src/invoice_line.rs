use chrono::NaiveDate;

use super::{EqualFilter, Sort};
#[derive(Clone, PartialEq, Debug)]
pub enum InvoiceLineType {
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
}
#[derive(Clone, PartialEq, Debug)]
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
    pub r#type: InvoiceLineType,
    pub sell_price_per_pack: f64,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub note: Option<String>,
}

pub struct InvoiceLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
}

impl InvoiceLineFilter {
    pub fn new() -> InvoiceLineFilter {
        InvoiceLineFilter {
            id: None,
            invoice_id: None,
            location_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn invoice_id(mut self, filter: EqualFilter<String>) -> Self {
        self.invoice_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }
}

pub type InvoiceLineSort = Sort<()>;
