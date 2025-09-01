use crate::{
    mock::{mock_goods_received_new, mock_item_a, mock_purchase_order_b_line_1},
    GoodsReceivedLineRow, GoodsReceivedLineStatus,
};

pub fn mock_goods_received_b_line_1() -> GoodsReceivedLineRow {
    GoodsReceivedLineRow {
        id: "test_goods_received_b_line_1".to_string(),
        purchase_order_line_id: mock_purchase_order_b_line_1().id,
        line_number: 1,
        item_link_id: mock_item_a().id,
        goods_received_id: mock_goods_received_new().id,
        status: GoodsReceivedLineStatus::Authorised,
        received_pack_size: 1.0,
        ..Default::default()
    }
}
pub fn mock_goods_received_lines() -> Vec<GoodsReceivedLineRow> {
    vec![mock_goods_received_b_line_1()]
}
