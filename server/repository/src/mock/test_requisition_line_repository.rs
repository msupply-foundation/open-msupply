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
    RequisitionLineRow {
        id: "mock_draft_request_requisition_line".to_string(),
        requisition_id: mock_request_draft_requisition().id,
        item_link_id: mock_item_a().id,
        requested_quantity: 10.0,
        suggested_quantity: 3.0,
        available_stock_on_hand: 1.0,
        average_monthly_consumption: 10.0,
        ..Default::default()
    }
}

pub fn mock_draft_request_requisition_line2() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_draft_request_requisition_line2".to_string(),
        requisition_id: mock_request_draft_requisition().id,
        item_link_id: mock_item_a().id,
        requested_quantity: 10.0,
        suggested_quantity: 3.0,
        available_stock_on_hand: 1.0,
        average_monthly_consumption: 10.0,
        ..Default::default()
    }
}
