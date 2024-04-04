use util::inline_init;

use crate::RequisitionLineRow;

use super::{mock_item_a, mock_request_draft_requisition, MockData};

pub fn mock_test_requisition_line_repository() -> MockData {
    let mut result = MockData::default();
    result
        .requisition_lines
        .push(mock_draft_request_requisition_line());
    result
        .requisition_lines
        .push(mock_draft_request_requisition_line2());
    result
}

pub fn mock_draft_request_requisition_line() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.id = "mock_draft_request_requisition_line".to_owned();
        r.requisition_id = mock_request_draft_requisition().id;
        r.item_link_id = mock_item_a().id;
        r.requested_quantity = 10;
        r.suggested_quantity = 3;
        r.available_stock_on_hand = 1;
        r.average_monthly_consumption = 10;
    })
}

pub fn mock_draft_request_requisition_line2() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.id = "mock_draft_request_requisition_line2".to_owned();
        r.requisition_id = mock_request_draft_requisition().id;
        r.item_link_id = mock_item_a().id;
        r.requested_quantity = 10;
        r.suggested_quantity = 3;
        r.available_stock_on_hand = 1;
        r.average_monthly_consumption = 10;
    })
}
