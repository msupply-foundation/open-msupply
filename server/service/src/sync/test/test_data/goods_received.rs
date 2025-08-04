use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::goods_received::{LegacyGoodsReceived, LegacyGoodsReceivedStatus},
};
use chrono::NaiveDate;
use repository::goods_received_row::{
    GoodsReceivedRow, GoodsReceivedRowDelete, GoodsReceivedStatus,
};
use serde_json::json;

const TABLE_NAME: &str = "Goods_received";

const GOODS_RECEIVED: (&str, &str) = (
    "3486239A597646B2B7259D91A24988E8",
    r#"{
        "ID": "3486239A597646B2B7259D91A24988E8",
        "budget_ID": "",
        "comment": "",
        "donor_id": "1FB32324AF8049248D929CFB35F255BA",
        "entry_date": "2025-07-24",
        "linked_transaction_ID": "12e889c0f0d211eb8dddb54df6d741bc",
        "purchase_order_ID": "12e889c0f0d211eb8dddb54df6d741hx",
        "received_date": "2025-07-24",
        "serial_number": 1,
        "status": "nw",
        "store_ID": "4E27CEB263354EB7B1B33CEA8F7884D8",
        "supplier_reference": "test po 1",
        "user_id_created": "user1",
        "user_id_modified": "user1"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GOODS_RECEIVED,
        GoodsReceivedRow {
            id: "3486239A597646B2B7259D91A24988E8".to_owned(),
            store_id: "4E27CEB263354EB7B1B33CEA8F7884D8".to_owned(),
            purchase_order_id: Some("12e889c0f0d211eb8dddb54df6d741hx".to_string()),
            inbound_shipment_id: Some("12e889c0f0d211eb8dddb54df6d741bc".to_string()),
            goods_received_number: 1,
            status: GoodsReceivedStatus::New.to_owned(),
            received_date: Some("2025-07-24".parse().unwrap()),
            comment: None,
            supplier_reference: Some("test po 1".to_string()),
            donor_link_id: Some("1FB32324AF8049248D929CFB35F255BA".to_string()),
            created_datetime: NaiveDate::from_ymd_opt(2025, 07, 24)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            finalised_datetime: None,
            created_by: Some("user1".to_string()),
        },
    )]
}

fn goods_received_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: GOODS_RECEIVED.0.to_string(),
        push_data: json!(LegacyGoodsReceived {
            id: "3486239A597646B2B7259D91A24988E8".to_string(),
            store_id: "4E27CEB263354EB7B1B33CEA8F7884D8".to_string(),
            purchase_order_id: Some("12e889c0f0d211eb8dddb54df6d741hx".to_string()),
            inbound_shipment_id: Some("12e889c0f0d211eb8dddb54df6d741bc".to_string()),
            goods_received_number: 1,
            status: LegacyGoodsReceivedStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2025, 07, 24).unwrap(),
            received_date: Some(NaiveDate::from_ymd_opt(2025, 07, 24).unwrap()),
            comment: None,
            supplier_reference: Some("test po 1".to_string()),
            donor_link_id: Some("1FB32324AF8049248D929CFB35F255BA".to_string()),
            created_by: Some("user1".to_string()),
        }),
    }
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        GOODS_RECEIVED.0,
        GoodsReceivedRowDelete(GOODS_RECEIVED.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![goods_received_push_record()]
}
