use repository::{ItemRow, ItemRowRepository, StockLineRow, StockLineRowRepository};

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

pub fn generate_outbound_return_lines(
    ctx: &ServiceContext,
    stock_line_ids: Vec<String>,
    item_id: Option<String>,
    return_id: Option<String>,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    validate(ctx, &stock_line_ids, &item_id, &return_id)?;

    // PERHAPS A JOIN BETTER HERE
    let stock_lines =
        StockLineRowRepository::new(&ctx.connection).find_many_by_ids(&stock_line_ids)?;

    let item_row_repo = ItemRowRepository::new(&ctx.connection);

    let return_lines: Vec<OutboundReturnLine> = stock_lines
        .iter()
        .map(|stock_line| OutboundReturnLine {
            id: "id".to_string(), // TODO make new
            item: item_row_repo
                .find_one_by_id(&stock_line.item_id)
                .unwrap()
                .expect("UH OH ITEM NOT FOUND"),
            stock_line: stock_line.clone(),

            // these will be populated by the insert... we should query for them from the existing return eventually
            reason_id: None,
            comment: None,
            number_of_packs: 0,
        })
        .collect();

    // if item id, query stock lines by item id?

    // if return_id, query for return lines by return id

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn validate(
    ctx: &ServiceContext,
    stock_line_ids: &Vec<String>,
    item_id: &Option<String>,
    return_id: &Option<String>,
) -> Result<(), ListError> {
    // store IDs
    // TODO: may need ServiceError?
    // error if nothing provided (stock line ids = [], item id = None, return id = None) as can't return anything

    // do we want to constrain anything around EITHER stock line ids or item id?

    // these ids need to exist in order to respond with return lines, but it is just a query - do we need to validate that they exist or just return an empty array?
    // validate stock line ids
    // validate item id
    // validate return id

    Ok(())
}
