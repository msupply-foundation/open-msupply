use async_graphql::*;
use chrono::NaiveDate;

#[derive(InputObject, Clone)]
pub struct GenerateInboundReturnInput {
    pub stock_line_ids: Vec<String>,
}

#[derive(SimpleObject, Clone)]
pub struct InboundReturnLine {
    pub id: String,
    pub item_code: String,
    pub item_name: String,
    pub stock_line_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: i32,
    pub number_of_packs_issued: f64,
    pub number_of_packs_returned: f64,
    pub note: Option<String>,
    pub reason_id: Option<String>,
}

pub fn generate_inbound_return_lines(
    _store_id: String,
    _input: GenerateInboundReturnInput,
) -> Result<Vec<InboundReturnLine>> {
    Ok(vec![InboundReturnLine {
        id: "new_inbound_return_line1".to_string(),
        // Below, don't have to match atm
        item_code: "abc".to_string(),
        item_name: "Item name 1".to_string(),
        stock_line_id: "stock_line_id".to_string(),
        batch: Some("batch A".to_string()),
        expiry_date: NaiveDate::from_ymd_opt(2024, 05, 10),
        pack_size: 20,
        number_of_packs_issued: 1000.0,
        number_of_packs_returned: 300.0,
        note: Some("Comment 1".to_string()),
        reason_id: None,
        // No location or unit column for now
    }])
}
