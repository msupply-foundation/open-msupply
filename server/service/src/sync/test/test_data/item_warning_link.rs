use repository::ItemWarningLinkRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "warning";

const ITEMWARNINGLINK_1: (&str, &str) = (
    "ITEMWARNINGLINK_1",
    r#"{
      "warning_ID": "1",
      "priority": "ITEMWARNINGLINK_1_exp",
      "ID": "ITEMWARNINGLINK_1"
      "item_ID": "ITEM_1"
    }"#,
);

const ITEMWARNINGLINK_2: (&str, &str) = (
    "ITEMWARNINGLINK_2",
    r#"{
      "warning_ID": "2",
      "priority": "ITEMWARNINGLINK_2_exp",
      "ID": "ITEMWARNINGLINK_2"
      "item_ID": "ITEM_2"
    }"#,
);

const ITEMWARNINGLINK_3: (&str, &str) = (
    "ITEMWARNINGLINK_3",
    r#"{
      "warning_ID": "3",
      "priority": "ITEMWARNINGLINK_3_exp",
      "ID": "ITEMWARNINGLINK_3"
      "item_ID": "ITEM_3"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_1,
            ItemWarningLinkRow {
                id: ITEMWARNINGLINK_1.0.to_owned(),
                warning_id: "1".to_owned(),
                item_link_id: "item_1".to_owned(),
                priority: false.to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_2,
            ItemWarningLinkRow {
                id: ITEMWARNINGLINK_2.0.to_owned(),
                warning_id: "2".to_owned(),
                item_link_id: "item_2".to_owned(),
                priority: true.to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_3,
            ItemWarningLinkRow {
                id: ITEMWARNINGLINK_3.0.to_owned(),
                warning_id: "3".to_owned(),
                item_link_id: "item_3".to_owned(),
                priority: false.to_owned(),
            },
        ),
    ]
}
