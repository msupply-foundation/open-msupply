use crate::{
    activity_log::activity_log_entry,
    invoice::{
        insert_prescription, update_prescription, InsertPrescriptionError, UpdatePrescriptionError,
    },
    invoice_line::stock_out_line::{insert_stock_out_line, InsertStockOutLineError},
    service_provider::ServiceContext,
    vaccination::validate::check_vaccine_course_dose_exists,
};

use chrono::NaiveDate;
use repository::{
    vaccination::{VaccinationFilter, VaccinationRepository},
    vaccine_course::vaccine_course_dose::{VaccineCourseDoseFilter, VaccineCourseDoseRepository},
    ActivityLogType, EqualFilter, ProgramEnrolmentRow, RepositoryError, Vaccination,
    VaccinationRowRepository,
};
use util::uuid::uuid;

mod generate;
mod validate;

use generate::{generate, GenerateInput, GenerateResult};
use validate::validate;

use super::{generate::CreatePrescription, query::get_vaccination};

#[derive(PartialEq, Debug)]
pub enum InsertVaccinationError {
    VaccinationAlreadyExists,
    EncounterDoesNotExist,
    ProgramEnrolmentDoesNotExist,
    VaccineCourseDoseDoesNotExist,
    ProgramEnrolmentDoesNotMatchVaccineCourse,
    VaccinationAlreadyExistsForDose,
    VaccineIsNotNextDose,
    ClinicianDoesNotExist,
    FacilityDoesNotExist,
    ReasonNotProvided,
    StockLineDoesNotExist,
    StockLineDoesNotMatchItem,
    ItemDoesNotExist,
    ItemDoesNotBelongToVaccineCourse,
    CreatedRecordNotFound,
    InternalError(String),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVaccination {
    pub id: String,
    pub encounter_id: String,
    pub vaccine_course_dose_id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub clinician_id: Option<String>,
    pub facility_name_id: Option<String>,
    pub facility_free_text: Option<String>,
    pub comment: Option<String>,
    pub given: bool,
    pub item_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub not_given_reason: Option<String>,
    /// Internal flag to unnecessary recursion when creating missing "Not Given"
    /// vaccinations
    pub create_not_given_records_for_skipped_doses: bool,
}

pub fn insert_vaccination(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertVaccination,
) -> Result<Vaccination, InsertVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            let (program_enrolment, stock_line) = validate(&input, connection, store_id)?;

            let GenerateResult {
                vaccination,
                create_prescription,
            } = generate(GenerateInput {
                store_id: store_id.to_string(),
                program_enrolment: program_enrolment.clone(),
                user_id: ctx.user_id.clone(),
                insert_input: input.clone(),
                stock_line,
            });

            // Create the vaccination
            VaccinationRowRepository::new(connection).upsert_one(&vaccination)?;

            // If can_skip_dose is enabled and we're not already doing backfill,
            // create "Not given" vaccinations for any missing previous doses
            if !input.create_not_given_records_for_skipped_doses {
                if let Ok(vaccine_course_dose) =
                    check_vaccine_course_dose_exists(&input.vaccine_course_dose_id, connection)
                {
                    if let Some(vaccine_course_dose) = vaccine_course_dose {
                        if vaccine_course_dose.vaccine_course_row.can_skip_dose {
                            create_missing_not_given_vaccinations(
                                ctx,
                                store_id,
                                &vaccine_course_dose.vaccine_course_row.id,
                                &input.vaccine_course_dose_id,
                                &program_enrolment,
                                &input,
                            )?;
                        }
                    }
                }
            }

            // If it was `Given`, create a prescription
            if let Some(CreatePrescription {
                create_prescription,
                insert_stock_out_line_input,
                finalise_prescription,
            }) = create_prescription
            {
                // Create prescription (in NEW status)
                insert_prescription(ctx, create_prescription)?;
                // Add the prescription line
                insert_stock_out_line(ctx, insert_stock_out_line_input)?;
                // Finalise the prescription - also link clinician
                update_prescription(ctx, finalise_prescription)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationCreated,
                Some(vaccination.id.clone()),
                None,
                None,
            )?;

            get_vaccination(ctx, vaccination.id).map_err(InsertVaccinationError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccination)
}

impl From<RepositoryError> for InsertVaccinationError {
    fn from(error: RepositoryError) -> Self {
        InsertVaccinationError::DatabaseError(error)
    }
}

impl From<InsertPrescriptionError> for InsertVaccinationError {
    fn from(error: InsertPrescriptionError) -> Self {
        InsertVaccinationError::InternalError(format!("Could not create prescription: {:?}", error))
    }
}
impl From<InsertStockOutLineError> for InsertVaccinationError {
    fn from(error: InsertStockOutLineError) -> Self {
        InsertVaccinationError::InternalError(format!(
            "Could not create prescription line: {:?}",
            error
        ))
    }
}
impl From<UpdatePrescriptionError> for InsertVaccinationError {
    fn from(error: UpdatePrescriptionError) -> Self {
        InsertVaccinationError::InternalError(format!("Could not update prescription: {:?}", error))
    }
}

fn create_missing_not_given_vaccinations(
    ctx: &ServiceContext,
    store_id: &str,
    vaccine_course_id: &str,
    current_vaccine_course_dose_id: &str,
    program_enrolment: &ProgramEnrolmentRow,
    original_input: &InsertVaccination,
) -> Result<(), InsertVaccinationError> {
    let connection = &ctx.connection;

    // Get all doses for this vaccine course
    let all_course_doses = VaccineCourseDoseRepository::new(connection).query_by_filter(
        VaccineCourseDoseFilter::new().vaccine_course_id(EqualFilter::equal_to(vaccine_course_id.to_string())),
    )?;

    // Find the current dose index
    let current_dose_index = all_course_doses
        .iter()
        .position(|v| &v.vaccine_course_dose_row.id == current_vaccine_course_dose_id)
        .unwrap_or(0);

    // Create "Not given" vaccinations for all previous doses that don't have vaccinations
    for (index, dose) in all_course_doses.iter().enumerate() {
        if index >= current_dose_index {
            break; // Only process doses before the current one
        }

        // Check if vaccination already exists for this dose
        let existing_vaccination = VaccinationRepository::new(connection).query_one(
            VaccinationFilter::new()
                .vaccine_course_dose_id(EqualFilter::equal_to(dose.vaccine_course_dose_row.id.to_string()))
                .program_enrolment_id(EqualFilter::equal_to(program_enrolment.id.to_string())),
        )?;

        // If no vaccination exists, create a "Not given" one by calling
        // insert_vaccination
        if existing_vaccination.is_none() {
            let not_given_input = InsertVaccination {
                id: uuid(),
                vaccine_course_dose_id: dose.vaccine_course_dose_row.id.clone(),
                given: false,
                item_id: None,
                stock_line_id: None,
                not_given_reason: Some("Dose skipped (Later dose administered)".to_string()),
                create_not_given_records_for_skipped_doses: true, // Prevent recursive backfill creation

                // Copy all other properties from the original input
                encounter_id: original_input.encounter_id.clone(),
                vaccination_date: original_input.vaccination_date,
                clinician_id: original_input.clinician_id.clone(),
                facility_name_id: original_input.facility_name_id.clone(),
                facility_free_text: original_input.facility_free_text.clone(),
                comment: original_input.comment.clone(),
            };

            // Call insert_vaccination for the missing dose
            insert_vaccination(ctx, store_id, not_given_input)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod insert {
    use repository::mock::{
        mock_encounter_a, mock_immunisation_encounter_a, mock_name_1, mock_patient_b,
        mock_program_a, mock_stock_line_b, mock_stock_line_vaccine_item_a, mock_store_a,
        mock_user_account_a, mock_vaccination_a, mock_vaccine_course_a_dose_a,
        mock_vaccine_course_a_dose_b, mock_vaccine_course_a_dose_c, mock_vaccine_item_a, MockData,
        MockDataInserts,
    };
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::{
        EncounterRow, InvoiceFilter, InvoiceRepository, InvoiceStatus, InvoiceType,
        StockLineRowRepository,
    };

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

        let service_provider = ServiceProvider::new(connection_manager);
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
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: "non_existent_vaccine_course_dose_id".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccineCourseDoseDoesNotExist)
        );

        // ProgramEnrolmentDoesNotMatchVaccineCourse
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_encounter_a().id, // non-immunisation program encounter
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ProgramEnrolmentDoesNotMatchVaccineCourse)
        );

        // VaccinationAlreadyExistsForDose
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_a().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccinationAlreadyExistsForDose)
        );

        // VaccineIsNotNextDose
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    // Only dose A has been administered
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccineIsNotNextDose)
        );

        // ClinicianDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    clinician_id: Some("non_existent_clinician_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ClinicianDoesNotExist)
        );

        // FacilityNameDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some("non_existent_facility_name_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::FacilityDoesNotExist)
        );

        // ReasonNotProvided
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: false,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ReasonNotProvided)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    item_id: Some("does_not_exist".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ItemDoesNotExist)
        );

        // ItemDoesNotBelongToVaccineCourse
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    item_id: Some("item_a".to_string()), // Item A not linked to vaccine course
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::ItemDoesNotBelongToVaccineCourse)
        );

        // StockLineDoesNotExist
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    item_id: Some(mock_vaccine_item_a().id),
                    stock_line_id: Some("non_existent_stock_line_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::StockLineDoesNotExist)
        );

        // StockLineDoesNotMatchItem
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    item_id: Some(mock_vaccine_item_a().id),
                    stock_line_id: Some(mock_stock_line_b().id), // Stock line B is not linked to vaccine item A
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::StockLineDoesNotMatchItem)
        );

        // VaccineIsNotNextDose (can't skip straight to dose C if B doesn't have a status yet)
        assert_eq!(
            service.insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    // Dose B does not exist yet
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccineIsNotNextDose)
        );

        // Insert dose B as NOT GIVEN
        service
            .insert_vaccination(
                &context,
                store_id,
                InsertVaccination {
                    id: "new_vaccination_given_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: false,
                    not_given_reason: Some("reason".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        // Test manual Skipping of dose B to dose C (e.g. Dose B was not given but it was records as such)
        let result = service.insert_vaccination(
            &context,
            store_id,
            InsertVaccination {
                id: "new_id".to_string(),
                encounter_id: mock_immunisation_encounter_a().id,
                // Dose B was not given, but we can manually skip and give dose C
                vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                given: true,
                ..Default::default()
            },
        );
        assert!(result.is_ok());
    }

    #[actix_rt::test]
    async fn insert_vaccination_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vaccination_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Can create - dose given
        let result = service_provider
            .vaccination_service
            .insert_vaccination(
                &context,
                &mock_store_a().id,
                InsertVaccination {
                    id: "new_vaccination_given_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    item_id: Some(mock_vaccine_item_a().id),
                    stock_line_id: Some(mock_stock_line_vaccine_item_a().id), // Vaccine item A is linked to vaccine course A
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_given_id");

        // Check invoice was created, and linked to vaccination
        let created_invoice = InvoiceRepository::new(&context.connection)
            .query_one(InvoiceFilter::new().stock_line_id(mock_stock_line_vaccine_item_a().id))
            .unwrap()
            .unwrap();

        assert_eq!(
            created_invoice.invoice_row.id,
            result.vaccination_row.invoice_id.unwrap()
        );
        assert_eq!(
            created_invoice.invoice_row.r#type,
            InvoiceType::Prescription
        );
        assert_eq!(created_invoice.invoice_row.status, InvoiceStatus::Verified);

        // Check stock was adjusted
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 5 doses per unit, 2 units per pack. 1 dose given, was 5.0, so 4.9 left
        assert_eq!(stock_line.available_number_of_packs, 4.9);

        // Can create - dose not given
        let result = service_provider
            .vaccination_service
            .insert_vaccination(
                &context,
                &mock_store_a().id,
                InsertVaccination {
                    id: "new_vaccination_not_given_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                    given: false,
                    not_given_reason: Some("reason".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_not_given_id");
    }

    #[actix_rt::test]
    async fn insert_vaccination_success_historical() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_vaccination_success_historical",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Can create - historical
        let result = service_provider
            .vaccination_service
            .insert_vaccination(
                &context,
                &mock_store_a().id,
                InsertVaccination {
                    id: "new_vaccination_historical".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    facility_name_id: Some(mock_name_1().id),
                    given: true,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_historical");
    }
}
