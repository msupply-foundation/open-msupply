use super::diesel_schema::invoice_line;

use chrono::NaiveDate;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "invoice_line"]
pub struct InvoiceLineRow {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub item_name: String,
    pub item_code: String,
    pub stock_line_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub total_after_tax: f64,
    pub number_of_packs: i32,
}
