use crate::vaccine_course::{
    vaccine_course_dose_row::VaccineCourseDoseRow, vaccine_course_row::VaccineCourseRow,
};

use super::mock_program_a;

pub fn mock_vaccine_course_a() -> VaccineCourseRow {
    VaccineCourseRow {
        id: "vaccine_course_a".to_string(),
        name: "Vaccine Course A".to_string(),
        program_id: mock_program_a().id,
        ..Default::default()
    }
}

pub fn mock_vaccine_course_a_dose_a() -> VaccineCourseDoseRow {
    VaccineCourseDoseRow {
        id: "vaccine_course_a_dose_a".to_string(),
        label: "Vaccine Course A Dose A".to_string(),
        vaccine_course_id: mock_vaccine_course_a().id,
        min_age: 0.0,
        min_interval_days: 30,
    }
}

pub fn mock_vaccine_course_a_dose_b() -> VaccineCourseDoseRow {
    VaccineCourseDoseRow {
        id: "vaccine_course_a_dose_b".to_string(),
        label: "Vaccine Course A Dose B".to_string(),
        vaccine_course_id: mock_vaccine_course_a().id,
        min_age: 0.0,
        min_interval_days: 30,
    }
}

pub fn mock_vaccine_courses() -> Vec<VaccineCourseRow> {
    vec![mock_vaccine_course_a()]
}
pub fn mock_vaccine_course_doses() -> Vec<VaccineCourseDoseRow> {
    vec![
        mock_vaccine_course_a_dose_a(),
        mock_vaccine_course_a_dose_b(),
    ]
}
