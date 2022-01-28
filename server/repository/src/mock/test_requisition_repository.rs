use chrono::NaiveDate;

use crate::schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType};

use super::MockData;

pub fn mock_test_requistion_repository() -> MockData {
    let mut result = MockData::default();
    result.requisitions.push(mock_request_draft_requisition());
    result.requisitions.push(mock_request_draft_requisition2());
    result
}

pub fn mock_request_draft_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_draft_requisition".to_owned(),
        requisition_number: 1,
        name_id: "name_a".to_owned(),
        store_id: "store_a".to_owned(),
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        threshold_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_request_draft_requisition2() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_draft_requisition2".to_owned(),
        requisition_number: 2,
        name_id: "name_a".to_owned(),
        store_id: "store_a".to_owned(),
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        threshold_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}
