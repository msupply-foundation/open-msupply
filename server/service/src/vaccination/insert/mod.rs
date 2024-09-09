use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use chrono::NaiveDate;
use repository::{ActivityLogType, RepositoryError, Vaccination, VaccinationRowRepository};

mod generate;
mod validate;

use generate::{generate, GenerateInput};
use validate::validate;

use super::query::get_vaccination;

#[derive(PartialEq, Debug)]
pub enum InsertVaccinationError {
    VaccinationAlreadyExists,
    EncounterDoesNotExist,
    ProgramEnrolmentDoesNotExist,
    VaccineCourseDoseDoesNotExist,
    VaccinationAlreadyExistsForDose,
    ClinicianDoesNotExist,
    ReasonNotProvided,
    StockLineNotProvided,
    StockLineDoesNotExist,
    ItemDoesNotBelongToVaccineCourse,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVaccination {
    pub id: String,
    pub encounter_id: String,
    pub vaccine_course_dose_id: String,
    pub vaccination_date: NaiveDate,
    pub clinician_id: Option<String>,
    pub comment: Option<String>,
    pub given: bool,
    pub stock_line_id: Option<String>,
    pub not_given_reason: Option<String>,
}

pub fn insert_vaccination(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertVaccination,
) -> Result<Vaccination, InsertVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            let program_enrolment_id = validate(&input, connection, store_id)?;
            let new_vaccination = generate(GenerateInput {
                store_id: store_id.to_string(),
                program_enrolment_id,
                user_id: ctx.user_id.clone(),
                insert_input: input.clone(),
            });

            VaccinationRowRepository::new(connection).upsert_one(&new_vaccination)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationCreated,
                Some(new_vaccination.id.clone()),
                None,
                None,
            )?;

            get_vaccination(ctx, new_vaccination.id).map_err(InsertVaccinationError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccination)
}

impl From<RepositoryError> for InsertVaccinationError {
    fn from(error: RepositoryError) -> Self {
        InsertVaccinationError::DatabaseError(error)
    }
}

// impl From<SingleRecordError> for InsertVaccinationError {
//     fn from(error: SingleRecordError) -> Self {
//         use InsertVaccinationError::*;
//         match error {
//             SingleRecordError::DatabaseError(error) => DatabaseError(error),
//             SingleRecordError::NotFound(_) => CreatedRecordNotFound,
//         }
//     }
// }

#[cfg(test)]
mod insert {
    use chrono::NaiveDate;
    use repository::mock::{
        mock_encounter_a, mock_item_b_stock_line_a, mock_patient_b, mock_program_a,
        mock_stock_line_a, mock_store_a, mock_store_b, mock_user_account_a, mock_vaccination_a,
        mock_vaccine_course_a_dose_a, mock_vaccine_course_a_dose_b, mock_vaccine_course_a_dose_c,
        MockData, MockDataInserts,
    };
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::EncounterRow;

    use crate::service_provider::ServiceProvider;
    use crate::vaccination::insert::{InsertVaccination, InsertVaccinationError};

    #[actix_rt::test]
    async fn insert_vaccination_errors() {
        fn encounter_for_unenrolled_patient() -> EncounterRow {
            EncounterRow {
                id: "encounter_for_unenrolled_program".to_string(),
                program_id: mock_program_a().id,
                patient_link_id: mock_patient_b().id,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_vaccination_errors",
            MockDataInserts::all(),
            MockData {
                encounters: vec![encounter_for_unenrolled_patient()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.vaccination_service;

        let store_id = &mock_store_a().id;
        // VaccinationAlreadyExists
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: mock_vaccination_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccinationAlreadyExists)
        );

        // EncounterDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: "non_existent_encounter_id".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::EncounterDoesNotExist)
        );

        // system error - shouldn't happen (if there is an encounter there should be a program enrolment)
        // ProgramEnrolmentDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: encounter_for_unenrolled_patient().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ProgramEnrolmentDoesNotExist)
        );

        // VaccineCourseDoseDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: "non_existent_vaccine_course_dose_id".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccineCourseDoseDoesNotExist)
        );

        // VaccinationAlreadyExistsForDose
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccinationAlreadyExistsForDose)
        );

        // ClinicianDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    clinician_id: Some("non_existent_clinician_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ClinicianDoesNotExist)
        );

        // StockLineNotProvided
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: true,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::StockLineNotProvided)
        );

        // ReasonNotProvided
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: false,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ReasonNotProvided)
        );

        // StockLineDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: true,
                    stock_line_id: Some("non_existent_stock_line_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::StockLineDoesNotExist)
        );

        // ItemDoesNotBelongToVaccineCourse
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: true,
                    stock_line_id: Some(mock_stock_line_a().id), // FOR ITEM A (not linked to vaccine course)
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ItemDoesNotBelongToVaccineCourse)
        );
    }

    #[actix_rt::test]
    async fn insert_vaccination_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vaccination_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // Can create - dose given
        let result = service_provider
            .vaccination_service
            .insert_vaccination(
                &context,
                &mock_store_b().id,
                InsertVaccination {
                    id: "new_vaccination_given_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    vaccination_date: NaiveDate::from_ymd_opt(2024, 9, 9).unwrap(),
                    given: true,
                    stock_line_id: Some(mock_item_b_stock_line_a().id), // Item B is linked to vaccine course A
                    clinician_id: None,
                    comment: None,
                    not_given_reason: None,
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_given_id");

        // Can create - dose not given
        let result = service_provider
            .vaccination_service
            .insert_vaccination(
                &context,
                &mock_store_b().id,
                InsertVaccination {
                    id: "new_vaccination_not_given_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                    vaccination_date: NaiveDate::from_ymd_opt(2024, 9, 9).unwrap(),
                    given: false,
                    not_given_reason: Some("reason".to_string()),
                    stock_line_id: None,
                    clinician_id: None,
                    comment: None,
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_not_given_id");
    }
}
