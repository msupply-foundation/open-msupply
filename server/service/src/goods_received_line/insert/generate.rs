use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineStatus},
    RepositoryError,
};

use super::InsertGoodsReceivedLineInput;

pub fn generate(
    input: InsertGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, RepositoryError> {
    // TODO: Look up details from purchase order line and use them to populate the goods received line
    Ok(GoodsReceivedLineRow {
        id: input.id,
        goods_received_id: input.goods_received_id,
        purchase_order_line_id: input.purchase_order_line_id,
        status: GoodsReceivedLineStatus::Unauthorised,
        ..Default::default()
    })
}
