use chrono::NaiveDateTime;

use super::diesel_schema::requisition_line;

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub requested_quantity: i32,
    pub suggested_quantity: i32,
    pub supply_quantity: i32,
    pub available_stock_on_hand: i32,
    pub average_monthly_consumption: i32,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
}
