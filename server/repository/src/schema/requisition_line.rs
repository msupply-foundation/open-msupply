use super::diesel_schema::requisition_line;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub requested_quantity: f64,
    pub calculated_quantity: f64,
    pub supply_quantity: f64,
    request_stock_on_hand: i32,
    request_average_monthly_consumption: i32,
    response_stock_on_hand: i32,
    response_average_monthly_consumption: i32,
}
