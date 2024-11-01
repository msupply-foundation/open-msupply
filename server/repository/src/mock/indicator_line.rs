use crate::{IndicatorLineRow, IndicatorValueType};

use super::mock_program_indicator_a;

pub fn mock_indicator_line_a() -> IndicatorLineRow {
    IndicatorLineRow {
        id: "indicator_line_row_a".to_owned(),
        code: "ira".to_owned(),
        program_indicator_id: mock_program_indicator_a().id,
        line_number: 0,
        description: "Some line A".to_owned(),
        value_type: None,
        default_value: "".to_owned(),
        is_required: false,
        is_active: true,
    }
}

pub fn mock_indicator_line_b() -> IndicatorLineRow {
    IndicatorLineRow {
        id: "indicator_line_row_b".to_owned(),
        code: "irb".to_owned(),
        program_indicator_id: mock_program_indicator_a().id,
        line_number: 1,
        description: "Some line B".to_owned(),
        value_type: Some(IndicatorValueType::String),
        default_value: "".to_owned(),
        is_required: false,
        is_active: true,
    }
}

pub fn mock_indicator_line_c() -> IndicatorLineRow {
    IndicatorLineRow {
        id: "indicator_line_row_b".to_owned(),
        code: "irc".to_owned(),
        program_indicator_id: mock_program_indicator_a().id,
        line_number: 2,
        description: "Some line C".to_owned(),
        value_type: Some(IndicatorValueType::Number),
        default_value: "0".to_owned(),
        is_required: false,
        is_active: true,
    }
}

pub fn mock_indicator_lines() -> Vec<IndicatorLineRow> {
    vec![
        mock_indicator_line_a(),
        mock_indicator_line_b(),
        mock_indicator_line_c(),
    ]
}
