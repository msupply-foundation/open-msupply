use super::diesel_schema::invoice_line;
use super::diesel_schema::invoice_line_stats;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "invoice_line"]
pub struct InvoiceLineRow {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<String>,
    pub pack_size: i32,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub total_after_tax: f64,
    pub available_number_of_packs: i32,
    pub total_number_of_packs: i32,
}

/// Row for the invoice_line_stats VIEW table (needed because of a Diesel limitation to query
/// aggregates and columns at the same time).
#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "invoice_line_stats"]
pub struct InvoiceLineStatsRow {
    pub invoice_id: String,
    pub total_after_tax: f64,
}
