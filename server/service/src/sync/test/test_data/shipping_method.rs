use super::TestSyncIncomingRecord;
use repository::shipping_method_row::ShippingMethodRow;

const TABLE_NAME: &str = "ship_method";

const SHIPPING_METHOD_1: (&str, &str) = (
    "SHIPPING_METHOD_1_ID",
    r#"{
        "ID": "SHIPPING_METHOD_1_ID",
        "method": "Standard Delivery"
    }"#,
);

fn shipping_method_1() -> ShippingMethodRow {
    ShippingMethodRow {
        id: SHIPPING_METHOD_1.0.to_string(),
        method: "Standard Delivery".to_string(),
        deleted_datetime: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        SHIPPING_METHOD_1,
        shipping_method_1(),
    )]
}
