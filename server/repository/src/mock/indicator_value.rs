use crate::IndicatorValueRow;

use super::{
    mock_indicator_column_a, mock_indicator_line_a, mock_period, mock_store_a, mock_store_b,
};

pub fn mock_indicator_value_a() -> IndicatorValueRow {
    IndicatorValueRow {
        id: String::from("id_a"),
        customer_name_link_id: mock_store_b().name_link_id,
        store_id: mock_store_a().id,
        period_id: mock_period().id,
        indicator_line_id: mock_indicator_line_a().id,
        indicator_column_id: mock_indicator_column_a().id,
        value: String::from("test_value"),
    }
}

pub fn mock_indicator_values() -> Vec<IndicatorValueRow> {
    vec![mock_indicator_value_a()]
}
