use super::{diesel_schema::invoice_line_stats, ItemType};

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset)]
#[table_name = "invoice_line_stats"]
pub struct InvoiceLineStatsRow {
    pub invoice_id: String,
    pub item_type: ItemType,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
}
