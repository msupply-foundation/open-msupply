use super::diesel_schema::requisition_line;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
    pub actual_quantity: f64,
    pub suggested_quantity: f64,
}
