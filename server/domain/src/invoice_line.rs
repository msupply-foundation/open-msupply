use chrono::NaiveDate;

use super::Sort;
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

pub type InvoiceLineSort = Sort<()>;
