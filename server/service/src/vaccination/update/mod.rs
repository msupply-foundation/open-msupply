use crate::{
    activity_log::activity_log_entry,
    invoice::{
        insert_prescription, inventory_adjustment::insert_inventory_adjustment,
        update_prescription, InsertPrescriptionError, UpdatePrescriptionError,
    },
    invoice_line::stock_out_line::{update_stock_out_line, UpdateStockOutLineError},
    service_provider::ServiceContext,
};

use chrono::NaiveDate;
use repository::{ActivityLogType, RepositoryError, Vaccination, VaccinationRowRepository};

mod generate;
mod validate;

use generate::{generate, CreatePrescription, GenerateInput, GenerateResult};
use validate::validate;

use super::query::get_vaccination;

#[derive(PartialEq, Debug)]
pub enum UpdateVaccinationError {
    VaccinationDoesNotExist,
    ClinicianDoesNotExist,
    ReasonNotProvided,
    StockLineNotProvided,
    StockLineDoesNotExist,
    ItemDoesNotBelongToVaccineCourse,
    NotNextDose,
    NotMostRecentDose,
    UpdatedRecordNotFound,
    InternalError(String),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVaccination {
    pub id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub clinician_id: Option<String>,
    pub comment: Option<String>,
    pub given: bool,
    pub stock_line_id: Option<String>,
    pub not_given_reason: Option<String>,
}

pub fn update_vaccination(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateVaccination,
) -> Result<Vaccination, UpdateVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            let (program_enrolment, stock_line) = validate(&input, connection, store_id)?;

            let GenerateResult {
                vaccination,
                create_prescription,
            } = generate(GenerateInput {
                store_id: store_id.to_string(),
                program_enrolment,
                user_id: ctx.user_id.clone(),
                update_input: input.clone(),
                stock_line,
            });

            // Update the vaccination
            VaccinationRowRepository::new(connection).upsert_one(&vaccination)?;

            // probably match on generate result
            // just details change: edit vaccination

            // change to not given
            // inventory adjustment - remove invoice id?

            insert_inventory_adjustment(ctx, input)?;

            // change to given

            // change item/stock line
            // adjustment AND create

            // If it was `Given`, create a prescription
            if let Some(CreatePrescription {
                insert_prescription_input,
                update_stock_out_line_input,
                update_prescription_input,
            }) = create_prescription
            {
                // Create prescription (in NEW status)
                insert_prescription(ctx, insert_prescription_input)?;
                // Add the prescription line
                update_stock_out_line(ctx, update_stock_out_line_input)?;
                // Finalise the prescription - also link clinician
                update_prescription(ctx, update_prescription_input)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationCreated,
                Some(vaccination.id.clone()),
                None,
                None,
            )?;

            get_vaccination(ctx, vaccination.id).map_err(UpdateVaccinationError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(vaccination)
}

impl From<RepositoryError> for UpdateVaccinationError {
    fn from(error: RepositoryError) -> Self {
        UpdateVaccinationError::DatabaseError(error)
    }
}

impl From<InsertInventoryAdjustmentError> for UpdateVaccinationError {
    fn from(error: InsertInventoryAdjustmentError) -> Self {
        UpdateVaccinationError::InternalError(format!(
            "Could not create inventory adjustment: {:?}",
            error
        ))
    }
}
impl From<InsertPrescriptionError> for UpdateVaccinationError {
    fn from(error: InsertPrescriptionError) -> Self {
        UpdateVaccinationError::InternalError(format!("Could not create prescription: {:?}", error))
    }
}
impl From<UpdateStockOutLineError> for UpdateVaccinationError {
    fn from(error: UpdateStockOutLineError) -> Self {
        UpdateVaccinationError::InternalError(format!(
            "Could not create prescription line: {:?}",
            error
        ))
    }
}
impl From<UpdatePrescriptionError> for UpdateVaccinationError {
    fn from(error: UpdatePrescriptionError) -> Self {
        UpdateVaccinationError::InternalError(format!(
            "Could not finalise prescription: {:?}",
            error
        ))
    }
}

#[cfg(test)]
mod update {
    use repository::mock::{
        mock_encounter_a, mock_immunisation_encounter_a, mock_patient_b, mock_program_a,
        mock_stock_line_a, mock_stock_line_vaccine_item_a, mock_store_a, mock_user_account_a,
        mock_vaccination_a, mock_vaccine_course_a_dose_a, mock_vaccine_course_a_dose_b,
        mock_vaccine_course_a_dose_c, MockData, MockDataInserts,
    };
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::{
        EncounterRow, InvoiceFilter, InvoiceRepository, InvoiceStatus, InvoiceType,
        StockLineRowRepository,
    };

    use crate::service_provider::ServiceProvider;
    use crate::vaccination::update::{UpdateVaccination, UpdateVaccinationError};

    #[actix_rt::test]
    async fn update_vaccination_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_vaccination_errors",
            MockDataInserts::all(),
            MockData {
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
        // VaccinationDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: "non-existent-id".to_string(),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::VaccinationDoesNotExist)
        );

        // ClinicianDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    clinician_id: Some("non_existent_clinician_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ClinicianDoesNotExist)
        );

        // StockLineNotProvided
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: true,
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::StockLineNotProvided)
        );

        // ReasonNotProvided
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: false,
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ReasonNotProvided)
        );

        // StockLineDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: true,
                    stock_line_id: Some("non_existent_stock_line_id".to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::StockLineDoesNotExist)
        );

        // ItemDoesNotBelongToVaccineCourse
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: true,
                    stock_line_id: Some(mock_stock_line_a().id), // FOR ITEM A (not linked to vaccine course)
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse)
        );
    }

    #[actix_rt::test]
    async fn update_vaccination_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_vaccination_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Can create - dose given
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: "new_vaccination_given_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                    given: true,
                    stock_line_id: Some(mock_stock_line_vaccine_item_a().id), // Vaccine item A is linked to vaccine course A
                    clinician_id: None,
                    vaccination_date: None,
                    comment: None,
                    not_given_reason: None,
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
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: "new_vaccination_not_given_id".to_string(),
                    encounter_id: mock_immunisation_encounter_a().id,
                    vaccine_course_dose_id: mock_vaccine_course_a_dose_c().id,
                    given: false,
                    not_given_reason: Some("reason".to_string()),
                    vaccination_date: None,
                    stock_line_id: None,
                    clinician_id: None,
                    comment: None,
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.id, "new_vaccination_not_given_id");
    }
}
