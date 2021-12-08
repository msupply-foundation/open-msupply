use super::diesel_schema::invoice_stats;

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset)]
#[table_name = "invoice_stats"]
pub struct InvoiceStatsRow {
    pub invoice_id: String,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub stock_total_before_tax: f64,
    pub stock_total_after_tax: f64,
    pub service_total_before_tax: f64,
    pub service_total_after_tax: f64,
}
