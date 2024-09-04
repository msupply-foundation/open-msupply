use repository::{MasterListLineRow, SyncBufferRow};
use util::inline_init;

use crate::sync::{test::TestSyncIncomingRecord, translations::PullTranslateResult};

const MASTER_LIST_LINE_1: (&str, &str) = (
    "9B02D0770B544BD1AC7DB99BB85FCDD5",
    r#"{
    "ID": "9B02D0770B544BD1AC7DB99BB85FCDD5",
    "item_master_ID": "item_query_test1",
    "item_ID": "item_a",
    "imprest_quan": 0,
    "order_number": 1,
    "price": 3.14
  }"#,
);

const MASTER_LIST_LINE_2: (&str, &str) = (
    "orphan",
    r#"{
    "ID": "9B02D0770B544BD1AC7DB99BB85FCDD5",
    "item_master_ID": "orphan",
    "item_ID": "8F252B5884B74888AAB73A0D42C09E7F",
    "imprest_quan": 0,
    "order_number": 1,
    "price": 0
  }"#,
);

fn master_list_line_a() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        "list_master_line",
        MASTER_LIST_LINE_1,
        MasterListLineRow {
            id: "9B02D0770B544BD1AC7DB99BB85FCDD5".to_string(),
            item_link_id: "item_a".to_string(),
            master_list_id: "item_query_test1".to_string(),
            price: Some(3.14),
        },
    )
}

fn master_list_line_b() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord {
        translated_record: PullTranslateResult::Ignored("Missing master list".to_string()),
        sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = "list_master_line".to_string();
            r.record_id = MASTER_LIST_LINE_2.0.to_string();
            r.data = MASTER_LIST_LINE_2.1.to_string();
        }),
        extra_data: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![master_list_line_a(), master_list_line_b()]
}
