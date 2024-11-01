use repository::{IndicatorColumnRow, IndicatorLineRow, IndicatorValueType};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "indicator_attribute";

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    let mut data = vec![];

    const INDICATOR_LINE_A: (&str, &str) = (
        "indicator_line_a",
        r#"{
            "ID": "indicator_line_a",
            "indicator_ID": "program_indicator_a",
            "description": "Some line A",
            "code": "ira",
            "index": 0,
            "is_required": false,
            "value_type": "var",
            "axis": "row",
            "is_active": true,
            "default_value": ""
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_LINE_A,
        IndicatorLineRow {
            id: INDICATOR_LINE_A.0.to_owned(),
            code: "ira".to_owned(),
            program_indicator_id: "program_indicator_a".to_owned(),
            line_number: 0,
            description: "Some line A".to_owned(),
            value_type: None,
            default_value: "".to_owned(),
            is_required: false,
            is_active: true,
        },
    ));

    const INDICATOR_LINE_B: (&str, &str) = (
        "indicator_line_b",
        r#"{
            "ID": "indicator_line_b",
            "indicator_ID": "program_indicator_a",
            "description": "Some line B",
            "code": "irb",
            "index": 1,
            "is_required": false,
            "value_type": "string",
            "axis": "row",
            "is_active": true,
            "default_value": ""
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_LINE_B,
        IndicatorLineRow {
            id: INDICATOR_LINE_B.0.to_owned(),
            code: "irb".to_owned(),
            program_indicator_id: "program_indicator_a".to_owned(),
            line_number: 1,
            description: "Some line B".to_owned(),
            value_type: Some(IndicatorValueType::String),
            default_value: "".to_owned(),
            is_required: false,
            is_active: true,
        },
    ));

    const INDICATOR_LINE_C: (&str, &str) = (
        "indicator_line_c",
        r#"{
            "ID": "indicator_line_c",
            "indicator_ID": "program_indicator_a",
            "description": "Some line C",
            "code": "irc",
            "index": 2,
            "is_required": false,
            "value_type": "number",
            "axis": "row",
            "is_active": true,
            "default_value": "0"
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_LINE_C,
        IndicatorLineRow {
            id: INDICATOR_LINE_C.0.to_owned(),
            code: "irc".to_owned(),
            program_indicator_id: "program_indicator_a".to_owned(),
            line_number: 2,
            description: "Some line C".to_owned(),
            value_type: Some(IndicatorValueType::Number),
            default_value: "0".to_owned(),
            is_required: false,
            is_active: true,
        },
    ));

    const INDICATOR_COLUMN_A: (&str, &str) = (
        "indicator_column_a",
        r#"{
            "ID": "indicator_column_a",
            "indicator_ID": "program_indicator_a",
            "description": "Some column A",
            "code": "ica",
            "index": 0,
            "is_required": false,
            "value_type": "var",
            "axis": "column",
            "is_active": true,
            "default_value": ""
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_COLUMN_A,
        IndicatorColumnRow {
            id: INDICATOR_COLUMN_A.0.to_owned(),
            program_indicator_id: "program_indicator_a".to_owned(),
            column_number: 0,
            header: "Some column A".to_owned(),
            value_type: None,
            default_value: "".to_owned(),
            is_active: true,
        },
    ));

    const INDICATOR_COLUMN_B: (&str, &str) = (
        "indicator_column_b",
        r#"{
            "ID": "indicator_column_b",
            "indicator_ID": "program_indicator_a",
            "description": "Some column B",
            "code": "icb",
            "index": 0,
            "is_required": false,
            "value_type": "string",
            "axis": "column",
            "is_active": true,
            "default_value": "test default value"
        }"#,
    );
    data.push(TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INDICATOR_COLUMN_B,
        IndicatorColumnRow {
            id: INDICATOR_COLUMN_B.0.to_owned(),
            program_indicator_id: "program_indicator_a".to_owned(),
            column_number: 0,
            header: "Some column B".to_owned(),
            value_type: Some(IndicatorValueType::String),
            default_value: "test default value".to_owned(),
            is_active: true,
        },
    ));

    data
}
