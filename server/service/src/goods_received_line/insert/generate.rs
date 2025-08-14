use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineStatus},
    purchase_order_line_row::PurchaseOrderLineRowRepository,
    RepositoryError, StorageConnection,
};

use super::InsertGoodsReceivedLineInput;

pub fn generate(
    connection: &StorageConnection,
    input: InsertGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, RepositoryError> {
    let purchase_order_line_repo = PurchaseOrderLineRowRepository::new(connection);
    let purchase_order_line = purchase_order_line_repo
        .find_one_by_id(&input.purchase_order_line_id)?
        .ok_or(RepositoryError::NotFound)?;

    Ok(GoodsReceivedLineRow {
        id: input.id,
        goods_received_id: input.goods_received_id,
        purchase_order_line_id: input.purchase_order_line_id,
        received_pack_size: purchase_order_line.requested_pack_size,
        line_number: purchase_order_line.line_number,
        item_link_id: purchase_order_line.item_link_id,
        item_name: purchase_order_line.item_name,
        status: GoodsReceivedLineStatus::Unauthorised,
        comment: purchase_order_line.comment,
        // Default values
        batch: None,
        number_of_packs_received: 0.0,
        weight_per_pack: None,
        expiry_date: None,
        location_id: None,
        volume_per_pack: None,
        manufacturer_link_id: None,
    })
}
