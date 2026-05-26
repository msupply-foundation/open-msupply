use crate::sync::test::TestSyncIncomingRecord;
use repository::mock::MockData;
use repository::*;

const TABLE_NAME: &str = "Goods_received";

// Non-finalized GR — should create a new InboundShipment invoice
const GR_NON_FINALISED: (&str, &str) = (
    "gr_non_finalised_test",
    r#"{
        "ID": "gr_non_finalised_test",
        "store_ID": "store_a",
        "purchase_order_ID": "test_purchase_order_a",
        "serial_number": 42,
        "status": "nw",
        "comment": "test comment",
        "supplier_reference": "sup ref",
        "user_id_created": "user_account_a",
        "entry_date": "2024-03-15",
        "received_date": "0000-00-00",
        "donor_id": ""
    }"#,
);

fn gr_non_finalised_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GR_NON_FINALISED,
        InvoiceRow {
            id: "gr_non_finalised_test".to_string(),
            name_id: "name_a".to_string(),
            store_id: "store_a".to_string(),
            user_id: Some("user_account_a".to_string()),
            invoice_number: 42,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            on_hold: false,
            comment: Some("test comment".to_string()),
            their_reference: Some("sup ref".to_string()),
            created_datetime: chrono::NaiveDate::from_ymd_opt(2024, 3, 15)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            purchase_order_id: Some("test_purchase_order_a".to_string()),
            ..Default::default()
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![gr_non_finalised_pull_record()]
}
