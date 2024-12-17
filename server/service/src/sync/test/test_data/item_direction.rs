use repository::{ItemDirectionRow, ItemDirectionRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const ITEM_DIRECTION_TABLE: &str = "item_direction";

const ITEM_DIRECTION_1: (&str, &str) = (
    "ITEM_DIRECTION_1",
    r#"{
        "ID": "ITEM_DIRECTION_1",
        "item_ID": "8F252B5884B74888AAB73A0D42C09E7A",
        "directions": "1m",
        "priority": 1
    }"#,
);

const ITEM_DIRECTION_2: (&str, &str) = (
    "ITEM_DIRECTION_2",
    r#"{
        "ID": "ITEM_DIRECTION_2",
        "item_ID": "8F252B5884B74888AAB73A0D42C09E7A",
        "directions": "are actually free text but may have abbreviations in it",
        "priority": 2
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            ITEM_DIRECTION_TABLE,
            ITEM_DIRECTION_1,
            ItemDirectionRow {
                id: ITEM_DIRECTION_1.0.to_owned(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_owned(),
                directions: "1m".to_owned(),
                priority: 1,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            ITEM_DIRECTION_TABLE,
            ITEM_DIRECTION_2,
            ItemDirectionRow {
                id: ITEM_DIRECTION_2.0.to_owned(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_owned(),
                directions: "are actually free text but may have abbreviations in it".to_owned(),
                priority: 2,
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        ITEM_DIRECTION_TABLE,
        ITEM_DIRECTION_1.0,
        ItemDirectionRowDelete(ITEM_DIRECTION_1.0.to_string()),
    )]
}
