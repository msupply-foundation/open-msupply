use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};

use chrono::NaiveDate;
use repository::{
    ActivityLogType, RepositoryError, StorageConnection, TransactionError, VaccinationRow,
    VaccinationRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum InsertVaccinationError {
    VaccinationAlreadyExists,
    EncounterDoesNotExist,
    VaccineCourseDoseDoesNotExist,
    VaccinationAlreadyExistsForDose,
    ClinicianDoesNotExist,
    StockLineNotProvided,
    ReasonNotProvided,
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
) -> Result<VaccinationRow, InsertVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            let encounter = validate(&input, connection)?;
            let new_vaccination = generate(store_id, encounter, input.clone());
            VaccinationRowRepository::new(connection).upsert_one(&new_vaccination)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationCreated,
                Some(new_vaccination.id.clone()),
                None,
                None,
            )?;

            Ok(new_vaccination)

            // get_vaccination(&ctx.connection, new_vaccination.id)
            //     .map_err(InsertVaccinationError::from)
        })
        .map_err(|error: TransactionError<InsertVaccinationError>| error.to_inner_error())?; // todo
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
    use repository::mock::{mock_encounter_a, mock_store_a, mock_vaccination_a, MockDataInserts};
    use repository::test_db::setup_all;

    use crate::service_provider::ServiceProvider;
    use crate::vaccination::insert::{InsertVaccination, InsertVaccinationError};

    #[actix_rt::test]
    async fn insert_vaccination_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vaccination_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
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

        // ClinicianDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id,
                    vaccine_course_dose_id: "new_vaccine_course_dose_id".to_string(),
                    clinician_id: Some("non_existent_clinician_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ClinicianDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn insert_vaccination_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vaccination_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Can create
        // let _result = service_provider
        //     .vaccination_service
        //     .insert_vaccination(
        //         &context,
        //         &mock_store_a().id,
        //         InsertVaccination {
        //             id: "new_rnr_id".to_string(),
        //             supplier_id: mock_name_store_c().id,
        //             program_id: mock_program_b().id,
        //             period_id: mock_period_2_c().id,
        //         },
        //     )
        //     .unwrap();
    }
}
