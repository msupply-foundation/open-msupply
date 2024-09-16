use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use repository::{
    EqualFilter, ProgramEnrolment, ProgramEnrolmentFilter, ProgramEnrolmentRepository,
    RepositoryError, VaccinationCardRepository, VaccinationCardRow,
};

use crate::service_provider::ServiceContext;

#[derive(Debug)]
pub struct VaccinationCard {
    pub enrolment: ProgramEnrolment,
    pub items: Vec<VaccinationCardItem>,
}

#[derive(Clone, Debug)]
pub struct VaccinationCardItem {
    pub row: VaccinationCardRow,
    pub suggested_date: Option<NaiveDate>,
}

pub fn get_vaccination_card(
    ctx: &ServiceContext,
    program_enrolment_id: String,
) -> Result<VaccinationCard, RepositoryError> {
    let enrolment = ProgramEnrolmentRepository::new(&ctx.connection)
        .query_by_filter(
            ProgramEnrolmentFilter::new().id(EqualFilter::equal_to(&program_enrolment_id)),
        )?
        .pop()
        .ok_or_else(|| RepositoryError::NotFound)?;

    let patient_dob = enrolment.patient_row.date_of_birth;

    let rows = VaccinationCardRepository::new(&ctx.connection)
        .query_by_enrolment_id(program_enrolment_id)?;

    let mut rows_by_course = HashMap::new();

    for row in rows.clone().into_iter() {
        rows_by_course
            .entry(row.vaccine_course_id.clone())
            .or_insert_with(Vec::new)
            .push(row);
    }

    let items = rows
        .into_iter()
        .map(|row| {
            let course_rows = rows_by_course
                .get(&row.vaccine_course_id)
                .unwrap_or(&Vec::new())
                .to_owned();

            let suggested_date = get_suggested_date(&row, patient_dob, course_rows);

            VaccinationCardItem {
                row,
                suggested_date,
            }
        })
        .collect();

    Ok(VaccinationCard { enrolment, items })
}

pub fn get_suggested_date(
    row: &VaccinationCardRow,
    patient_dob: Option<NaiveDate>,
    course_rows: Vec<VaccinationCardRow>,
) -> Option<NaiveDate> {
    let suggested_date_by_age = patient_dob
        .map(|dob| dob.checked_add_signed(Duration::days((row.min_age * 365.25 / 12.0) as i64)))
        .flatten();

    // If the dose was already given, no need to suggest date
    if row.given == Some(true) {
        return None;
    }

    let dose_index = match course_rows.iter().position(|r| r.id == row.id) {
        // Shouldn't be possible, couldn't find dose in course
        None => {
            return None;
        }
        // If its the first dose in the course, suggested date is patient dob + min_age
        Some(0) => {
            return suggested_date_by_age;
        }
        Some(index) => index,
    };

    let previous_dose = match course_rows.get(dose_index - 1) {
        Some(dose) => dose,
        None => {
            // Shouldn't be possible, couldn't find previous dose
            return None;
        }
    };

    // If previous dose was not given, we shouldn't suggest this one
    if previous_dose.given != Some(true) {
        return None;
    };

    let suggested_date_by_min_interval = previous_dose.vaccination_date.and_then(|date| {
        date.checked_add_signed(chrono::Duration::days(row.min_interval_days as i64))
    });

    match (suggested_date_by_age, suggested_date_by_min_interval) {
        // If we have both, pick the later one
        (Some(by_age), Some(by_interval)) => {
            if by_age > by_interval {
                Some(by_age)
            } else {
                Some(by_interval)
            }
        }
        (Some(by_age), None) => Some(by_age),
        (None, Some(by_interval)) => Some(by_interval),
        (None, None) => None,
    }
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_immunisation_program_a, mock_immunisation_program_enrolment_a, mock_patient,
            mock_vaccine_course_a_dose_a, MockDataInserts,
        },
        NameRow, NameRowRepository, VaccinationCardRow,
    };

    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::{get_suggested_date, get_vaccination_card};

    #[actix_rt::test]
    async fn test_get_vaccination_card() {
        let ServiceTestContext {
            connection,
            service_context,
            ..
        } = setup_all_and_service_provider("test_get_vaccination_card", MockDataInserts::all())
            .await;

        // add DOB to the patient in the enrolment
        NameRowRepository::new(&connection)
            .upsert_one(&NameRow {
                date_of_birth: NaiveDate::from_ymd_opt(2024, 1, 1),
                ..mock_patient()
            })
            .unwrap();

        let program_enrolment_id = mock_immunisation_program_enrolment_a().id;

        let result = get_vaccination_card(&service_context, program_enrolment_id).unwrap();

        assert_eq!(result.items.len(), 3);
        assert_eq!(
            result.enrolment.program_row.id,
            mock_immunisation_program_a().id
        );
        // For first row
        let first_item = &result.items[0];
        // Check it is dose 1
        assert_eq!(
            first_item.row.vaccine_course_dose_id,
            mock_vaccine_course_a_dose_a().id
        );
        // There is a vaccination, it was NOT given
        assert_eq!(first_item.row.given, Some(false));
        // Hence there is still a suggested date based on the DOB
        assert_eq!(
            first_item.suggested_date,
            NaiveDate::from_ymd_opt(2024, 1, 1)
        );
        // Second dose therefore has no suggested date
        assert_eq!(result.items[1].suggested_date, None);
    }

    #[actix_rt::test]
    async fn test_get_suggested_date() {
        let given = VaccinationCardRow {
            id: "given".to_string(),
            min_age: 1.0,
            given: Some(true),
            vaccination_date: NaiveDate::from_ymd_opt(2020, 2, 3),
            ..Default::default()
        };
        let not_given = VaccinationCardRow {
            id: "not_given".to_string(),
            given: Some(false),
            min_age: 2.0,
            ..Default::default()
        };
        let pending = VaccinationCardRow {
            id: "pending".to_string(),
            min_age: 3.0,
            min_interval_days: 90,
            ..Default::default()
        };
        let pending_2 = VaccinationCardRow {
            id: "pending_2".to_string(),
            min_age: 4.0,
            min_interval_days: 30,
            ..Default::default()
        };

        let dob = NaiveDate::from_ymd_opt(2020, 1, 1);

        // Dose was given already, no suggested date
        let date = get_suggested_date(&given, None, vec![given.clone()]);
        assert_eq!(date, None);

        // -- FIRST DOSE OF COURSE --

        // If no DOB, can't suggest a date
        let date = get_suggested_date(&pending, None, vec![pending.clone()]);
        assert_eq!(date, None);

        // If DOB, suggested date is DOB + min_age
        let date = get_suggested_date(&pending, dob.clone(), vec![pending.clone()]);
        assert_eq!(date, NaiveDate::from_ymd_opt(2020, 4, 1)); // 3 months old

        // Still suggest a date if the dose was not given
        let date = get_suggested_date(&not_given, dob.clone(), vec![not_given.clone()]);
        assert_eq!(date, NaiveDate::from_ymd_opt(2020, 3, 1)); // 2 months old

        // -- SUBSEQUENT DOSES --

        // If no vaccination event for previous dose, no suggested date
        let date = get_suggested_date(
            &pending_2,
            dob.clone(),
            vec![pending.clone(), pending_2.clone()],
        );
        assert_eq!(date, None);

        // If previous dose was not given, no suggested date
        let date = get_suggested_date(
            &pending,
            dob.clone(),
            vec![not_given.clone(), pending.clone()],
        );
        assert_eq!(date, None);

        // If previous dose was given, add min interval for suggested date (if later than min age)
        let date = get_suggested_date(&pending, dob.clone(), vec![given.clone(), pending.clone()]);
        assert_eq!(date, NaiveDate::from_ymd_opt(2020, 5, 3)); // 90 days after 3/2/2020

        // If previous dose was given, add min age for suggested date (if later than min interval)
        let date = get_suggested_date(&pending_2, dob, vec![given, pending_2.clone()]);
        assert_eq!(date, NaiveDate::from_ymd_opt(2020, 5, 1)); // 4 months old
    }
}
