use crate::sync::test::TestSyncIncomingRecord;
use repository::ItemStoreJoinRow;

const TABLE_NAME: &str = "item_store_join";

const ITEM_STORE_JOIN_INVALID_LOCATION: (&str, &str) = (
    "item_store_join_invalid_location",
    r#"{
        "AMC_modification_factor": 0,
        "ID": "item_store_join_invalid_location",
        "bulk_replenish_at_packs": 0,
        "bulk_replenish_up_to_packs": 0,
        "custom_data": null,
        "default_location_ID": "non_existent_location",
        "default_price": 5.0,
        "estimated_AMC": 0,
        "forecast_method": 0,
        "hold_for_issue": false,
        "hold_for_receive": false,
        "ignore_for_orders": true,
        "inactive": false,
        "include_on_price_list": false,
        "indic_price": 0,
        "item_ID": "item_a",
        "location_bulk_ID": "",
        "margin": 0.0,
        "maximum_stock": 0,
        "minimum_stock": 0,
        "non_stock": false,
        "non_stock_name_ID": "",
        "pack_to_one": true,
        "pack_to_one_allow": true,
        "pickface_location_ID": "",
        "pickface_pack_size": 0,
        "pickface_replenish_at_packs": 0,
        "pickface_replenish_up_to_packs": 0,
        "projection_for_calcs": "",
        "report_quantity": 0,
        "restricted_location_type_id": "",
        "store_ID": "store_b"
    }"#,
);

const ITEM_STORE_JOIN_1: (&str, &str) = (
    "item_store_join_1",
    r#"{
        "AMC_modification_factor": 0,
        "ID": "item_store_join_1",
        "bulk_replenish_at_packs": 0,
        "bulk_replenish_up_to_packs": 0,
        "custom_data": null,
        "default_location_ID": "",
        "default_price": 10.0,
        "estimated_AMC": 0,
        "forecast_method": 0,
        "hold_for_issue": false,
        "hold_for_receive": false,
        "ignore_for_orders": false,
        "inactive": false,
        "include_on_price_list": false,
        "indic_price": 0,
        "item_ID": "item_a",
        "location_bulk_ID": "",
        "margin": 10.0,
        "maximum_stock": 0,
        "minimum_stock": 0,
        "non_stock": false,
        "non_stock_name_ID": "",
        "pack_to_one": true,
        "pack_to_one_allow": true,
        "pickface_location_ID": "",
        "pickface_pack_size": 0,
        "pickface_replenish_at_packs": 0,
        "pickface_replenish_up_to_packs": 0,
        "projection_for_calcs": "",
        "report_quantity": 0,
        "restricted_location_type_id": "",
        "store_ID": "store_b"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEM_STORE_JOIN_INVALID_LOCATION,
            ItemStoreJoinRow {
                id: ITEM_STORE_JOIN_INVALID_LOCATION.0.to_owned(),
                item_link_id: "item_a".to_string(),
                store_id: "store_b".to_string(),
                default_sell_price_per_pack: 5.0,
                ignore_for_orders: true,
                margin: 0.0,
                default_location_id: None, // Invalid location cleared
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEM_STORE_JOIN_1,
            ItemStoreJoinRow {
                id: ITEM_STORE_JOIN_1.0.to_owned(),
                item_link_id: "item_a".to_string(),
                store_id: "store_b".to_string(),
                default_sell_price_per_pack: 10.0,
                ignore_for_orders: false,
                margin: 10.0,
                default_location_id: None,
            },
        ),
    ]
}
