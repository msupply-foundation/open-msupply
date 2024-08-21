use chrono::NaiveDate;

use crate::{RnRFormLineRow, RnRFormRow, RnRFormStatus};

use super::{item_query_test1, mock_period_2_a, mock_period_2_b, mock_program_b, mock_store_a};

pub fn mock_rnr_form_a() -> RnRFormRow {
    RnRFormRow {
        id: "rnr_form_a".to_string(),
        store_id: mock_store_a().id,
        name_link_id: String::from("name_store_b"),
        period_id: mock_period_2_a().id,
        program_id: mock_program_b().id,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        status: RnRFormStatus::Finalised,
        ..Default::default()
    }
}

pub fn mock_rnr_form_b() -> RnRFormRow {
    RnRFormRow {
        id: "rnr_form_b".to_string(),
        store_id: mock_store_a().id,
        name_link_id: String::from("name_store_b"),
        period_id: mock_period_2_b().id,
        program_id: mock_program_b().id,
        created_datetime: NaiveDate::from_ymd_opt(2024, 3, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        status: RnRFormStatus::Draft,
        ..Default::default()
    }
}

pub fn mock_rnr_form_a_line_a() -> RnRFormLineRow {
    RnRFormLineRow {
        id: "rnr_form_a_line_a".to_string(),
        rnr_form_id: mock_rnr_form_a().id,
        item_link_id: item_query_test1().id,
        final_balance: 5.0,
        average_monthly_consumption: 5.0,
        adjusted_quantity_consumed: 5.0,
        ..Default::default()
    }
}

pub fn mock_rnr_form_b_line_a() -> RnRFormLineRow {
    RnRFormLineRow {
        id: "rnr_form_b_line_a".to_string(),
        rnr_form_id: mock_rnr_form_b().id,
        item_link_id: item_query_test1().id,
        initial_balance: 10.0,
        snapshot_quantity_received: 5.0,
        snapshot_quantity_consumed: 7.0,
        snapshot_adjustments: -1.0,
        final_balance: 7.0,
        average_monthly_consumption: 7.0,
        adjusted_quantity_consumed: 7.0,
        ..Default::default()
    }
}

pub fn mock_rnr_forms() -> Vec<RnRFormRow> {
    vec![mock_rnr_form_a(), mock_rnr_form_b()]
}

pub fn mock_rnr_form_lines() -> Vec<RnRFormLineRow> {
    vec![mock_rnr_form_a_line_a(), mock_rnr_form_b_line_a()]
}
