use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineStatus},
    purchase_order_line_row::PurchaseOrderLineRowRepository,
    NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertGoodsReceivedLineInput;

pub fn generate(
    connection: &StorageConnection,
    input: InsertGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, RepositoryError> {
    let purchase_order_line_repo = PurchaseOrderLineRowRepository::new(connection);
    let purchase_order_line = purchase_order_line_repo
        .find_one_by_id(&input.purchase_order_line_id)?
        .ok_or(RepositoryError::NotFound)?;

    let goods_received_line_number = next_number(
        connection,
        &NumberRowType::GoodsReceivedLine(input.goods_received_id.clone()),
        &purchase_order_line.store_id,
    )?;

    Ok(GoodsReceivedLineRow {
        id: input.id,
        goods_received_id: input.goods_received_id,
        purchase_order_line_id: input.purchase_order_line_id,
        received_pack_size: input
            .received_pack_size
            .unwrap_or(purchase_order_line.requested_pack_size),
        line_number: goods_received_line_number,
        item_link_id: purchase_order_line.item_link_id,
        item_name: purchase_order_line.item_name,
        status: GoodsReceivedLineStatus::Unauthorised,
        comment: input.comment.or(purchase_order_line.comment),
        // Values from input or defaults
        batch: input.batch,
        number_of_packs_received: input.number_of_packs_received.unwrap_or(0.0),
        weight_per_pack: None,
        expiry_date: input.expiry_date,
        location_id: None,
        volume_per_pack: None,
        manufacturer_id: input.manufacturer_id,
    })
}
