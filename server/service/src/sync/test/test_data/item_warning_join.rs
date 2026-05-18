use repository::ItemWarningJoinRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "item_warning_link";

const ITEMWARNINGLINK_1: (&str, &str) = (
    "ITEMWARNINGLINK_1",
    r#"{
      "Spare": 0,
      "item_ID": "8F252B5884B74888AAB73A0D42C09E7A",
      "warning_ID": "WARNING_1",
      "priority": false,
      "ID": "ITEMWARNINGLINK_1"
    }"#,
);

const ITEMWARNINGLINK_2: (&str, &str) = (
    "ITEMWARNINGLINK_2",
    r#"{
      "Spare": 0,
      "item_ID": "8F252B5884B74888AAB73A0D42C09E7A",
      "warning_ID": "WARNING_2",
      "priority": true,
      "ID": "ITEMWARNINGLINK_2"
    }"#,
);

const ITEMWARNINGLINK_3: (&str, &str) = (
    "ITEMWARNINGLINK_3",
    r#"{
      "Spare": 0,
      "item_ID": "8F252B5884B74888AAB73A0D42C09E7A",
      "warning_ID": "WARNING_3",
      "priority": false,
      "ID": "ITEMWARNINGLINK_3"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_1,
            ItemWarningJoinRow {
                id: ITEMWARNINGLINK_1.0.to_owned(),
                warning_id: "WARNING_1".to_string(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
                priority: false.to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_2,
            ItemWarningJoinRow {
                id: ITEMWARNINGLINK_2.0.to_owned(),
                warning_id: "WARNING_2".to_string(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
                priority: true.to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEMWARNINGLINK_3,
            ItemWarningJoinRow {
                id: ITEMWARNINGLINK_3.0.to_owned(),
                warning_id: "WARNING_3".to_string(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
                priority: false.to_owned(),
            },
        ),
    ]
}
