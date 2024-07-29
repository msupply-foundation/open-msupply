use chrono::NaiveDate;

use crate::{RnRFormRow, RnRFormStatus};

use super::{mock_period_2_a, mock_program_b, mock_store_a};

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
        status: RnRFormStatus::Draft,
        ..Default::default()
    }
}

pub fn mock_rnr_forms() -> Vec<RnRFormRow> {
    vec![mock_rnr_form_a()]
}
