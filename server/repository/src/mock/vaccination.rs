use chrono::NaiveDate;

use crate::VaccinationRow;

use super::{
    mock_encounter_a, mock_program_enrolment_a, mock_store_a, mock_user_account_a,
    mock_vaccine_course_a_dose_a,
};

pub fn mock_vaccination_a() -> VaccinationRow {
    VaccinationRow {
        id: "vaccination_a".to_string(),
        store_id: mock_store_a().id,
        user_id: mock_user_account_a().id,
        program_enrolment_id: mock_program_enrolment_a().id,
        vaccine_course_dose_id: mock_vaccine_course_a_dose_a().id,
        encounter_id: mock_encounter_a().id,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_vaccinations() -> Vec<VaccinationRow> {
    vec![mock_vaccination_a()]
}
