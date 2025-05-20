use crate::sync::test::TestSyncIncomingRecord;
use repository::{ReasonOptionRow, ReasonOptionType};

const INVENTORY_ADJUSTMENT_REASON_1: (&str, &str) = (
    "positive_adjustment",
    r#"{
    "ID": "positive_adjustment",
    "type": "positiveInventoryAdjustment",
    "isActive": true,
    "title": "Found"
    }"#,
);
const RETURN_REASON_1: (&str, &str) = (
    "return_reason",
    r#"{
    "ID": "return_reason",
    "type": "returnReason",
    "isActive": true,
    "title": "Damaged"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            "options",
            INVENTORY_ADJUSTMENT_REASON_1,
            ReasonOptionRow {
                id: INVENTORY_ADJUSTMENT_REASON_1.0.to_string(),
                r#type: ReasonOptionType::PositiveInventoryAdjustment,
                is_active: true,
                reason: "Found".to_string(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            "options",
            RETURN_REASON_1,
            ReasonOptionRow {
                id: RETURN_REASON_1.0.to_string(),
                r#type: ReasonOptionType::ReturnReason,
                is_active: true,
                reason: "Damaged".to_string(),
            },
        ),
    ]
}
