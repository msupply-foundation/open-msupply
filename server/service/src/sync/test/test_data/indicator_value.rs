use repository::{IndicatorValueRow, IndicatorValueRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "indicator_attribute";

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    let mut data = vec![];

    const INDICATOR_VALUE_A: (&str, &str) = (
        "indicator_value_a",
        r#"{
          "ID": "indicator_value_a",
          "facility_ID": "name_a",
          "period_ID": "period_1",
          "column_ID": "indicator_column_a",
          "row_ID": "indicator_line_a",
          "value": "123",
          "store_ID": "store_a"
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_VALUE_A,
        IndicatorValueRow {
            id: "indicator_value_a".to_owned(),
            customer_name_link_id: "name_a".to_owned(),
            supplier_store_id: "store_a".to_owned(),
            period_id: "period_1".to_owned(),
            indicator_line_id: "indicator_line_a".to_owned(),
            indicator_column_id: "indicator_column_a".to_owned(),
            value: "123".to_owned(),
        },
    ));

    const INDICATOR_VALUE_B: (&str, &str) = (
        "indicator_value_b",
        r#"{
          "ID": "indicator_value_b",
          "facility_ID": "name_a",
          "period_ID": "period_1",
          "column_ID": "indicator_column_b",
          "row_ID": "indicator_line_a",
          "value": "My life for Aiur",
          "store_ID": "store_a"
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_VALUE_B,
        IndicatorValueRow {
            id: "indicator_value_b".to_owned(),
            customer_name_link_id: "name_a".to_owned(),
            supplier_store_id: "store_a".to_owned(),
            period_id: "period_1".to_owned(),
            indicator_line_id: "indicator_line_a".to_owned(),
            indicator_column_id: "indicator_column_b".to_owned(),
            value: "My life for Aiur".to_owned(),
        },
    ));
    data
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    test_pull_upsert_records()
        .into_iter()
        .map(|r| {
            TestSyncIncomingRecord::new_pull_delete(
                &r.sync_buffer_row.table_name,
                &r.sync_buffer_row.record_id,
                IndicatorValueRowDelete(r.sync_buffer_row.record_id.clone()),
            )
        })
        .collect()
}
