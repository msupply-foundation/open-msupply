use chrono::NaiveDate;

use crate::schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType};

use super::MockData;

pub fn mock_test_requistion_service() -> MockData {
    let mut result = MockData::default();
    result.requisitions.push(mock_requistion_for_number_test());
    result
}

pub fn mock_requistion_for_number_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_requistion_for_number_test".to_owned(),
        requisition_number: 111111111,
        name_id: "name_a".to_owned(),
        store_id: "store_a".to_owned(),
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        color: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        threshold_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}
