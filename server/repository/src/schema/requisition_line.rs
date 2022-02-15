use super::diesel_schema::requisition_line;

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub requested_quantity: i32,
    pub calculated_quantity: i32,
    pub supply_quantity: i32,
    pub stock_on_hand: i32,
    pub average_monthly_consumption: i32,
}
