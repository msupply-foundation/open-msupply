use crate::sync::test::TestSyncIncomingRecord;
use chrono::NaiveDate;
use repository::goods_received_row::{
    GoodsReceivedRow, GoodsReceivedRowDelete, GoodsReceivedStatus,
};

const TABLE_NAME: &str = "goods_received";

const GOODS_RECEIVED: (&str, &str) = (
    "GOODS_RECEIVED",
    r#"{
        "ID": "3486239A597646B2B7259D91A24988E8",
        "budget_ID": "",
        "comment": "",
        "donor_id": "",
        "entry_date": "2025-07-24",
        "linked_transaction_ID": "",
        "purchase_order_ID": "622C9D65F5124BA5B11DF55B6FB1627B",
        "received_date": "2025-07-24",
        "serial_number": 1,
        "status": "nw",
        "store_ID": "80004C94067A4CE5A34FC343EB1B4306",
        "supplier_reference": "test po 1",
        "user_id_created": "0763E2E3053D4C478E1E6B6B03FEC207",
        "user_id_modified": "0763E2E3053D4C478E1E6B6B03FEC207"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GOODS_RECEIVED,
        GoodsReceivedRow {
            id: "3486239A597646B2B7259D91A24988E8".to_owned(),
            store_id: "80004C94067A4CE5A34FC343EB1B4306".to_owned(),
            purchase_order_id: Some("622C9D65F5124BA5B11DF55B6FB1627B".to_string()),
            inbound_shipment_id: None,
            goods_received_number: 1,
            status: GoodsReceivedStatus::New.to_owned(),
            received_date: Some("2025-07-24".parse().unwrap()),
            comment: None,
            supplier_reference: Some("test po 1".to_string()),
            donor_link_id: None,
            created_datetime: NaiveDate::from_ymd_opt(2025, 07, 24)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            finalised_datetime: None,
            created_by: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
        },
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        GOODS_RECEIVED.0,
        GoodsReceivedRowDelete(GOODS_RECEIVED.0.to_string()),
    )]
}
