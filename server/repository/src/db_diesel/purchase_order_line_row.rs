use chrono::NaiveDate;

// TODO to move into db_diesel layer when finalised:
#[derive(PartialEq, Debug, Default, Clone)]
pub struct PurchaseOrderLineRow {
    pub id: String,
    pub item_code: String,
    pub item_name: Option<String>,
    pub number_of_packs: Option<f64>,
    pub pack_size: Option<f64>,
    pub original_quantity: Option<f64>,
    pub adjusted_quantity: Option<f64>,
    pub total_received: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub purchase_order_id: String,
}
