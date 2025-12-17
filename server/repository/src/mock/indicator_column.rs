use crate::{IndicatorColumnRow, IndicatorValueType};

use super::mock_program_indicator_a;

pub fn mock_indicator_column_a() -> IndicatorColumnRow {
    IndicatorColumnRow {
        id: "indicator_column_a".to_string(),
        program_indicator_id: mock_program_indicator_a().id,
        column_number: 0,
        header: "Some column A".to_string(),
        value_type: None,
        default_value: "".to_string(),
        is_active: true,
    }
}

pub fn mock_indicator_column_b() -> IndicatorColumnRow {
    IndicatorColumnRow {
        id: "indicator_column_b".to_string(),
        program_indicator_id: mock_program_indicator_a().id,
        column_number: 1,
        header: "Some column B".to_string(),
        value_type: Some(IndicatorValueType::String),
        default_value: "test default value".to_string(),
        is_active: true,
    }
}

pub fn mock_indicator_columns() -> Vec<IndicatorColumnRow> {
    vec![mock_indicator_column_a(), mock_indicator_column_b()]
}
