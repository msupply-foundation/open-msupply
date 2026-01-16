use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::goods_received_line::LegacyGoodsReceivedLineRow,
};
use chrono::NaiveDate;
use repository::{GoodsReceivedLineDelete, GoodsReceivedLineRow};
use serde_json::json;

const TABLE_NAME: &str = "Goods_received_line";

const GOODS_RECEIVED_LINE: (&str, &str) = (
    "917BA6AEC9984FF09F6DB8599CA426B0",
    r#"{
        "ID": "917BA6AEC9984FF09F6DB8599CA426B0",
        "authorised_comment": "",
        "batch_received": "sal_bat_one",
        "comment": "",
        "cost_price": 0,
        "custom_stock_field_1": "",
        "custom_stock_field_2": "",
        "custom_stock_field_3": "",
        "custom_stock_field_4": "",
        "expiry_date": "2018-03-19",
        "goods_received_ID": "3486239A597646B2B7259D91A24988E8",
        "is_authorised": true,
        "item_ID": "8F252B5884B74888AAB73A0D42C09E7A", 
        "item_name": "Salbutamol Inhaler",
        "kit_data": null,
        "line_number": 3,
        "location_ID": "cf5812e0c33911eb9757779d39ae2bdb",
        "manufacturer_ID": "1FB32324AF8049248D929CFB35F255BA",
        "order_line_ID": "sync_test_purchase_order_1_line_1",
        "pack_inners_in_outer": 0,
        "pack_quan_in_inner": 0,
        "pack_received": 5,
        "quantity_received": 50,
        "remoteCustomerInvoiceLineID": "",
        "spare_note_has_been_actioned": false,
        "volume_per_pack": 0,
        "weight_per_pack": 1
    }"#,
);

fn goods_received_line_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GOODS_RECEIVED_LINE,
        GoodsReceivedLineRow {
            id: "917BA6AEC9984FF09F6DB8599CA426B0".to_string(),
            goods_received_id: "3486239A597646B2B7259D91A24988E8".to_string(),
            purchase_order_line_id: "sync_test_purchase_order_1_line_1".to_string(),
            received_pack_size: 5.0,
            number_of_packs_received: 50.0,
            batch: Some("sal_bat_one".to_string()),
            weight_per_pack: Some(1.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            line_number: 3,
            item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
            item_name: "Salbutamol Inhaler".to_string(),
            location_id: Some("cf5812e0c33911eb9757779d39ae2bdb".to_string()),
            volume_per_pack: None,
            manufacturer_id: Some("1FB32324AF8049248D929CFB35F255BA".to_string()),
            status: repository::GoodsReceivedLineStatus::Authorised,
            comment: None,
        },
    )
}

fn goods_received_line_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: GOODS_RECEIVED_LINE.0.to_string(),
        push_data: json!(LegacyGoodsReceivedLineRow {
            ID: GOODS_RECEIVED_LINE.0.to_string(),
            goods_received_ID: "3486239A597646B2B7259D91A24988E8".to_string(),
            order_line_ID: "sync_test_purchase_order_1_line_1".to_string(),
            pack_received: 5.0,
            quantity_received: 50.0,
            batch_received: Some("sal_bat_one".to_string()),
            weight_per_pack: Some(1.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            line_number: 3,
            item_ID: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
            item_name: "Salbutamol Inhaler".to_string(),
            location_ID: Some("cf5812e0c33911eb9757779d39ae2bdb".to_string()),
            volume_per_pack: None,
            manufacturer_ID: Some("1FB32324AF8049248D929CFB35F255BA".to_string()),
            is_authorised: true,
            comment: None,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![goods_received_line_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![goods_received_line_push_record()]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        GOODS_RECEIVED_LINE.0,
        GoodsReceivedLineDelete(GOODS_RECEIVED_LINE.0.to_string()),
    )]
}
