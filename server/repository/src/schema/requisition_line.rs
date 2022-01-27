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
    pub request_stock_on_hand: i32,
    pub request_average_monthly_consumption: i32,
    pub response_stock_on_hand: i32,
    pub response_average_monthly_consumption: i32,
}
