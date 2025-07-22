use crate::sync::test::TestSyncIncomingRecord;
use chrono::NaiveDate;

use repository::goods_receiving_row::{GoodsReceivingRow, GoodsReceivingStatus};
use serde_json::json;

const TABLE_NAME: &str = "goods_receiving";

const GOODS_RECEIVING_1: (&str, &str) = (
    "A32E72C3A730457088D5B7A50D1AD076",
    r#"{
        "ID": "A32E72C3A730457088D5B7A50D1AD076",
        "budget_ID": "",
        "comment": "",
        "donor_id": "",
        "entry_date": "2020-03-16",
        "linked_transaction_ID": "8A66A7D9D02048EF97E40E15C34FC496",
        "purchase_order_ID": "FA9FFB5F474E4EE998ADA2632E41E6BF",
        "received_date": "2020-03-16",
        "serial_number": 1,
        "status": "fn",
        "store_ID": "3934979D64934D12A1757BA65F07931D",
        "supplier_reference": "From PO number: 1",
        "user_id_created": "0763E2E3053D4C478E1E6B6B03FEC207",
        "user_id_modified": ""
    }"#,
);

fn goods_receiving_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GOODS_RECEIVING_1,
        GoodsReceivingRow {
            id: GOODS_RECEIVING_1.0.to_string(),
            store_id: "3934979D64934D12A1757BA65F07931D".to_string(),
            purchase_order_id: Some("FA9FFB5F474E4EE998ADA2632E41E6BF".to_string()),
            inbound_shipment_id: Some("8A66A7D9D02048EF97E40E15C34FC496".to_string()),
            goods_receiving_number: 1,
            status: GoodsReceivingStatus::Finalised,
            received_date: Some(NaiveDate::from_ymd_opt(2020, 3, 16).unwrap()),
            comment: None,
            supplier_reference: Some("From PO number: 1".to_string()),
            donor_link_id: None,
            created_datetime: NaiveDate::from_ymd_opt(2020, 3, 16)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            modified_datetime: NaiveDate::from_ymd_opt(2020, 3, 16)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            finalised_datetime: None,
            created_by: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            modified_by: None,
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![goods_receiving_pull_record()]
}
