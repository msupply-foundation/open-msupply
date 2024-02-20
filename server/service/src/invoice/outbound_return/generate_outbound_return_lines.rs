use repository::StockLineRow;

use crate::{service_provider::ServiceContext, ListError, ListResult};

pub struct OutboundReturnLine {
    reason_id: Option<String>,
    comment: Option<String>,
    number_of_packs: u32,
    stock_line: StockLineRow,
}

pub(crate) fn generate_outbound_return_lines(
    ctx: &ServiceContext,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    todo!();
}
