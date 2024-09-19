use crate::{
    activity_log::activity_log_entry,
    invoice::{
        insert_prescription,
        inventory_adjustment::{insert_inventory_adjustment, InsertInventoryAdjustmentError},
        update_prescription, InsertPrescriptionError, UpdatePrescriptionError,
    },
    invoice_line::stock_out_line::{insert_stock_out_line, InsertStockOutLineError},
    service_provider::ServiceContext,
    NullableUpdate,
};

use chrono::NaiveDate;
use repository::{ActivityLogType, RepositoryError, Vaccination, VaccinationRowRepository};

mod generate;
mod validate;

use generate::{generate, GenerateInput, GenerateResult};
use validate::{validate, ValidateResult};

use super::{generate::CreatePrescription, query::get_vaccination};

#[derive(PartialEq, Debug)]
pub enum UpdateVaccinationError {
    VaccinationDoesNotExist,
    ClinicianDoesNotExist,
    ReasonNotProvided,
    StockLineNotProvided,
    StockLineDoesNotExist,
    ItemDoesNotBelongToVaccineCourse,
    NotNextDose,
    NotMostRecentGivenDose,
    UpdatedRecordNotFound,
    InternalError(String),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVaccination {
    pub id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub clinician_id: Option<NullableUpdate<String>>,
    pub comment: Option<String>,
    pub given: Option<bool>,
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
            let ValidateResult {
                vaccination: existing_vaccination,
                patient_id,
                existing_stock_line,
                new_stock_line,
            } = validate(&input, connection, store_id)?;

            let GenerateResult {
                vaccination,
                create_inventory_adjustment,
                create_prescription,
            } = generate(GenerateInput {
                update_input: input.clone(),
                existing_vaccination,
                patient_id,
                existing_stock_line,
                new_stock_line,
            });

            // Update the vaccination
            VaccinationRowRepository::new(connection).upsert_one(&vaccination)?;

            // Reverse existing prescription if needed
            if let Some(create_inventory_adjustment) = create_inventory_adjustment {
                insert_inventory_adjustment(ctx, create_inventory_adjustment)?;
            }

            // Create new prescription if needed
            if let Some(CreatePrescription {
                insert_prescription_input,
                insert_stock_out_line_input,
                update_prescription_input,
            }) = create_prescription
            {
                // Create prescription (in NEW status)
                insert_prescription(ctx, insert_prescription_input)?;
                // Add the prescription line
                insert_stock_out_line(ctx, insert_stock_out_line_input)?;
                // Finalise the prescription - also link clinician
                update_prescription(ctx, update_prescription_input)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationUpdated,
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
impl From<InsertStockOutLineError> for UpdateVaccinationError {
    fn from(error: InsertStockOutLineError) -> Self {
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
    use chrono::NaiveDate;
    use repository::mock::{
        mock_immunisation_encounter_a, mock_immunisation_program_enrolment_a, mock_patient,
        mock_stock_line_a, mock_stock_line_b_vaccine_item_a, mock_stock_line_vaccine_item_a,
        mock_store_a, mock_user_account_a, mock_vaccination_a, mock_vaccine_course_a_dose_b,
        MockData, MockDataInserts,
    };
    use repository::test_db::{setup_all, setup_all_with_data};
    use repository::{
        InvoiceFilter, InvoiceRepository, InvoiceType, StockLineRowRepository, VaccinationRow,
        VaccinationRowRepository,
    };

    use crate::service_provider::ServiceProvider;
    use crate::vaccination::update::{UpdateVaccination, UpdateVaccinationError};
    use crate::NullableUpdate;

    #[actix_rt::test]
    async fn update_vaccination_errors() {
        fn mock_vaccination_b_given() -> VaccinationRow {
            VaccinationRow {
                id: "mock_vaccination_b_given".to_string(),
                store_id: mock_store_a().id,
                user_id: mock_user_account_a().id,
                program_enrolment_id: mock_immunisation_program_enrolment_a().id,
                vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                encounter_id: mock_immunisation_encounter_a().id,
                given: true,
                created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_vaccination_errors",
            MockDataInserts::all(),
            MockData {
                vaccinations: vec![mock_vaccination_b_given()],
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
                    clinician_id: Some(NullableUpdate {
                        value: Some("non_existent_clinician_id".to_string())
                    }),
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
                    given: Some(true),
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
                    given: Some(false),
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
                    given: Some(true),
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
                    given: Some(true),
                    stock_line_id: Some(mock_stock_line_a().id), // FOR ITEM A (not linked to vaccine course)
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse)
        );

        // NotMostRecentGivenDose
        // try to un-give but more recent dose was given
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id, // vaccination (dose) B was also given, cant un-give A before B
                    given: Some(false),
                    not_given_reason: Some("reason".to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::NotMostRecentGivenDose)
        );

        // NotNextDose

        // Update both vaccinations to be NOT given (testing purposes)
        let vaccinations_repo = VaccinationRowRepository::new(&context.connection);
        vaccinations_repo
            .upsert_one(&VaccinationRow {
                given: false,
                ..mock_vaccination_a()
            })
            .unwrap();
        vaccinations_repo
            .upsert_one(&VaccinationRow {
                given: false,
                ..mock_vaccination_b_given()
            })
            .unwrap();

        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_b_given().id, // vaccination (dose) A was also not given, cant give B before A
                    given: Some(true),
                    stock_line_id: Some(mock_stock_line_vaccine_item_a().id),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::NotNextDose)
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

        // Update: Just details
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    comment: Some("Updated comment".to_string()),
                    stock_line_id: None,
                    given: None,
                    clinician_id: None,
                    vaccination_date: None,
                    not_given_reason: None,
                },
            )
            .unwrap();

        assert_eq!(
            result.vaccination_row.comment,
            Some("Updated comment".to_owned())
        );
    }

    #[actix_rt::test]
    async fn update_vaccination_success_invoice_adjustments() {
        let (_, _, connection_manager, _) = setup_all(
            "update_vaccination_success_invoice_adjustments",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // ----------------------------
        // Update: Not given -> given
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(true),
                    stock_line_id: Some(mock_stock_line_vaccine_item_a().id), // Vaccine item A is linked to vaccine course A
                    clinician_id: None,
                    vaccination_date: None,
                    comment: None,
                    not_given_reason: None,
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.given, true);

        // Check invoice was created, and linked to vaccination
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_vaccine_item_a().id),
            )
            .unwrap();

        assert_eq!(created_invoices.len(), 1);
        let invoice = &created_invoices[0].invoice_row;
        assert!(invoice.r#type == InvoiceType::Prescription);
        assert_eq!(invoice.id, result.vaccination_row.invoice_id.unwrap());

        // Check stock was adjusted
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 5 doses per unit, 2 units per pack. 1 dose given, was 5.0, so 4.9 left
        assert_eq!(stock_line.available_number_of_packs, 4.9);

        // ----------------------------
        // Update: Change stock_line
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    stock_line_id: Some(mock_stock_line_b_vaccine_item_a().id),
                    given: None,
                    clinician_id: None,
                    vaccination_date: None,
                    comment: None,
                    not_given_reason: None,
                },
            )
            .unwrap();

        // Still given
        assert_eq!(result.vaccination_row.given, true);

        // New invoice has been created, inventory addition to reverse the original prescription
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_vaccine_item_a().id),
            )
            .unwrap();

        assert_eq!(created_invoices.len(), 2);
        assert!(created_invoices
            .iter()
            .any(|inv| inv.invoice_row.r#type == InvoiceType::InventoryAddition));

        // Check stock was adjusted back up
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 1 dose was reversed, was 4.9, so 5.0 now
        assert_eq!(stock_line.available_number_of_packs, 5.0);

        // Check new prescription was created, and linked to vaccination
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_b_vaccine_item_a().id),
            )
            .unwrap();

        assert_eq!(created_invoices.len(), 1);
        let invoice = &created_invoices[0].invoice_row;
        assert!(invoice.r#type == InvoiceType::Prescription);
        assert_eq!(invoice.id, result.vaccination_row.invoice_id.unwrap());

        // Check stock was adjusted
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_b_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 2 doses per unit, 20 units per pack. 1 dose given, was 10.0, so 9.975 left
        assert_eq!(stock_line.available_number_of_packs, 9.975);

        // ----------------------------
        // Update: Given -> not given
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(false),
                    not_given_reason: Some("out of stock".to_string()),
                    stock_line_id: None,
                    clinician_id: None,
                    vaccination_date: None,
                    comment: None,
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.given, false);
        assert_eq!(
            result.vaccination_row.not_given_reason,
            Some("out of stock".to_string())
        );

        // New invoice has been created, inventory addition to reverse the prescription
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_b_vaccine_item_a().id),
            )
            .unwrap();

        assert_eq!(created_invoices.len(), 2);
        assert!(created_invoices.iter().any(|inv| inv.invoice_row.r#type
            == InvoiceType::InventoryAddition
            && inv.name_row.id == mock_patient().id));

        // Check stock was adjusted back up
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_b_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 1 dose was reversed, was 9.975, so now 10
        assert_eq!(stock_line.available_number_of_packs, 10.0);
    }
}
