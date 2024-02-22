use repository::{ItemRow, StockLineRow};

use crate::{service_provider::ServiceContext, ListError, ListResult};

pub struct OutboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub comment: Option<String>,
    pub number_of_packs: u32,
    pub stock_line: StockLineRow,
    pub item: ItemRow,
}

pub fn generate_outbound_return_lines(
    ctx: &ServiceContext,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    Ok(ListResult {
        count: 1,
        rows: vec![OutboundReturnLine {
            id: "id".to_string(),
            reason_id: None,
            comment: None,
            number_of_packs: 0,
            item: ItemRow {
                id: "item_id".to_string(),
                code: "x_item_code".to_string(),
                name: "item_name".to_string(),
                ..Default::default()
            },
            stock_line: StockLineRow {
                id: "stock_line_id".to_string(),
                item_id: "item_id".to_string(),
                store_id: "store_id".to_string(),
                batch: Some("batch".to_string()),
                pack_size: 0,
                available_number_of_packs: 0.0,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                ..Default::default()
            },
        }],
    })
}
