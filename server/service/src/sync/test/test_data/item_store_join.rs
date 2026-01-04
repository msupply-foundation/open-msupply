use crate::sync::test::TestSyncIncomingRecord;
use repository::ItemStoreJoinRow;

const TABLE_NAME: &str = "item_store_join";

const ITEM_STORE_JOIN_1: (&str, &str) = (
    "item_store_join_1",
    r#"{
        "ID": "item_store_join_1",
        "item_ID": "item_a",
        "store_ID": "store_b",
        "default_price": 10.0,
        "ignore_for_orders": false,
        "margin": 10.0
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ITEM_STORE_JOIN_1,
        ItemStoreJoinRow {
            id: ITEM_STORE_JOIN_1.0.to_owned(),
            item_link_id: "item_a".to_string(),
            store_id: "store_b".to_string(),
            default_sell_price_per_pack: 10.0,
            ignore_for_orders: false,
            margin: 10.0,
        },
    )]
}
