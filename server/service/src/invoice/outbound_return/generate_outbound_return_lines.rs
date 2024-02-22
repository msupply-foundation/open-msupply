use repository::{ItemRow, StockLineRow};

use crate::{service_provider::ServiceContext, ListError, ListResult};

pub struct OutboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub comment: Option<String>,
    pub number_of_packs: u32,
    pub stock_line: StockLineRow,
    // TODO: should Item be here or should we make a new join query on stockline??
    pub item: ItemRow,
}

pub struct OutboundReturnLinesInput {
    pub stock_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

pub fn generate_outbound_return_lines(
    ctx: &ServiceContext,
    input: OutboundReturnLinesInput,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    // validate
    // - stock line ids exist?
    // - item_id exists?
    // - return_id exists?
    // wondering if we do need the inbound shipment id - don't I need to validate its delivered/verified?
    // what else does backend need to check to determine stock is returnable?
    // maybe not much - if quantity available is 0, then can't do anything after this

    /*
     THEN!
    v1:
    query for stock lines
    query for items based on ids in stock lines, or consider join here

    v2
    if item id, query stock lines by item id?

    v3
    if return_id, query for return lines by return id
     */
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
