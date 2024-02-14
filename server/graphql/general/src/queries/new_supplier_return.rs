use async_graphql::*;
use chrono::NaiveDate;

#[derive(InputObject, Clone)]
pub struct SupplierReturnInput {
    pub inbound_shipment_line_ids: Vec<String>,
}

#[derive(SimpleObject, Clone)]
pub struct SupplierReturnLine {
    pub id: String,
    pub item_code: String,
    pub item_name: String,
    pub stock_line_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub available_number_of_packs: f64,
    pub pack_size: i32,
    pub number_of_packs_to_return: f64,
}

pub fn new_supplier_return(
    _store_id: String,
    _input: SupplierReturnInput,
) -> Result<Vec<SupplierReturnLine>> {
    Ok(vec![SupplierReturnLine {
        id: "new_supplier_return_line1".to_string(),
        // Below, don't have to match atm
        item_code: "abc".to_string(),
        item_name: "Item name 1".to_string(),
        stock_line_id: "stock_line_id".to_string(),
        batch: Some("batch A".to_string()),
        expiry_date: NaiveDate::from_ymd_opt(2024, 05, 10),
        available_number_of_packs: 1000.0,
        pack_size: 20,
        number_of_packs_to_return: 300.0,
        // No location or unit column for now
    }])
}
