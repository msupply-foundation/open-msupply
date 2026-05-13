use chrono::NaiveDate;

use crate::{
    requisition_row::{RequisitionStatus, RequisitionType},
    RequisitionRow,
};

use super::{mock_name_b, mock_store_a, MockData};

pub fn mock_test_requisition_repository() -> MockData {
    let mut result = MockData::default();
    result.requisitions.push(mock_request_draft_requisition());
    result.requisitions.push(mock_request_draft_requisition2());
    result.requisitions.push(mock_request_draft_requisition3());
    result.requisitions.push(new_response_requisition());
    result
}

pub fn mock_request_draft_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_draft_requisition".to_string(),
        requisition_number: 1,
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_request_draft_requisition2() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_draft_requisition2".to_string(),
        requisition_number: 2,
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_request_draft_requisition3() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_draft_requisition3".to_string(),
        requisition_number: 2,
        name_id: "name_a".to_string(),
        store_id: "store_b".to_string(),
        ..Default::default()
    }
}

pub fn mock_program_request_draft_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_program_request_draft_requisition".to_string(),
        requisition_number: 1,
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        program_id: Some("program_a".to_string()),
        order_type: Some("order_type_a".to_string()),
        period_id: Some("period_a".to_string()),
        ..Default::default()
    }
}

pub fn new_response_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "new response requisition id".to_string(),
        store_id: mock_store_a().id,
        name_id: mock_name_b().id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        ..Default::default()
    }
}
