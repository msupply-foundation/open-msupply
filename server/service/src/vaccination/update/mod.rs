use crate::{
    activity_log::activity_log_entry,
    invoice::{
        insert_prescription, update_prescription, InsertPrescriptionError, UpdatePrescription,
        UpdatePrescriptionError, UpdatePrescriptionStatus,
    },
    invoice_line::stock_out_line::{insert_stock_out_line, InsertStockOutLineError},
    service_provider::ServiceContext,
    vaccination::update::generate::CancelPrescription,
    NullableUpdate,
};

use chrono::NaiveDate;
use repository::{ActivityLogType, RepositoryError, Vaccination, VaccinationRowRepository};

mod generate;
mod validate;

use generate::{generate, GenerateResult};
use validate::validate;

use super::{generate::CreatePrescription, query::get_vaccination};

#[derive(PartialEq, Debug)]
pub enum UpdateVaccinationError {
    VaccinationDoesNotExist,
    ClinicianDoesNotExist,
    FacilityNameDoesNotExist,
    ReasonNotProvided,
    StockLineDoesNotExist,
    StockLineDoesNotMatchItem,
    ItemDoesNotExist,
    ItemDoesNotBelongToVaccineCourse,
    NotNextDose,
    NotMostRecentGivenDose,
    NotGivenFromThisStore,
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
    pub item_id: Option<NullableUpdate<String>>,
    pub stock_line_id: Option<NullableUpdate<String>>,
    pub not_given_reason: Option<String>,
    pub facility_name_id: Option<NullableUpdate<String>>,
    pub facility_free_text: Option<NullableUpdate<String>>,
    pub update_transactions: Option<bool>,
}

pub fn update_vaccination(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateVaccination,
) -> Result<Vaccination, UpdateVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            let validate_result = validate(&input, connection, store_id)?;

            let GenerateResult {
                vaccination,
                cancel_prescription,
                create_prescription,
            } = generate(store_id, validate_result, input.clone());

            // Update the vaccination
            VaccinationRowRepository::new(connection).upsert_one(&vaccination)?;

            // Reverse existing prescription if needed
            // NOTE: We reverse the whole prescription so if in the future we want to reverse just some lines on the prescription this logic might need to change
            if let Some(CancelPrescription { prescription_id }) = cancel_prescription {
                update_prescription(
                    ctx,
                    UpdatePrescription {
                        id: prescription_id,
                        status: Some(UpdatePrescriptionStatus::Cancelled),
                        ..Default::default()
                    },
                )?;
            }

            // Create new prescription if needed
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
        UpdateVaccinationError::InternalError(format!("Could not update prescription: {:?}", error))
    }
}

#[cfg(test)]
mod update {
    use chrono::NaiveDate;
    use repository::mock::{
        mock_immunisation_encounter_a, mock_immunisation_program_enrolment_a, mock_item_a,
        mock_patient, mock_stock_line_a, mock_stock_line_b_vaccine_item_a,
        mock_stock_line_vaccine_item_a, mock_store_a, mock_store_b, mock_user_account_a,
        mock_vaccination_a, mock_vaccine_course_a_dose_b, MockData, MockDataInserts,
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
                patient_link_id: mock_patient().id,
                store_id: mock_store_a().id,
                user_id: mock_user_account_a().id,
                program_enrolment_id: mock_immunisation_program_enrolment_a().id,
                vaccine_course_dose_id: mock_vaccine_course_a_dose_b().id,
                encounter_id: mock_immunisation_encounter_a().id,
                stock_line_id: Some(mock_stock_line_vaccine_item_a().id),
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
                names: vec![mock_patient()],
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

        // FacilityNameDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    facility_name_id: Some(NullableUpdate {
                        value: Some("non_existent_clinician_id".to_string())
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::FacilityNameDoesNotExist)
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

        // ItemDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    item_id: Some(NullableUpdate {
                        value: Some("non_existent_item_id".to_string())
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ItemDoesNotExist)
        );

        // ItemDoesNotBelongToVaccineCourse
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    item_id: Some(NullableUpdate {
                        value: Some(mock_item_a().id) // mock_item_a() does not belong to the vaccine course
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::ItemDoesNotBelongToVaccineCourse)
        );

        // StockLineDoesNotExist
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(true),
                    stock_line_id: Some(NullableUpdate {
                        value: Some("non_existent_stock_line_id".to_string())
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::StockLineDoesNotExist)
        );

        // StockLineDoesNotMatchItem
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(true),
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_a().id)
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::StockLineDoesNotMatchItem)
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

        // NotGivenFromThisStore
        // try to change related stock line from a store other than the one it was given from
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_b_given().id,
                    given: Some(true),
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_b_vaccine_item_a().id)
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::NotGivenFromThisStore)
        );

        // NotGivenFromThisStore
        // try to un-give from a store other than the one it was given from
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_b_given().id,
                    given: Some(false),
                    not_given_reason: Some("reason".to_string()),
                    ..Default::default()
                }
            ),
            Err(UpdateVaccinationError::NotGivenFromThisStore)
        );

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

        // NotNextDose
        assert_eq!(
            service.update_vaccination(
                &context,
                store_id,
                UpdateVaccination {
                    id: mock_vaccination_b_given().id, // vaccination (dose) A was also not given, cant give B before A
                    given: Some(true),
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_vaccine_item_a().id)
                    }),
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

        let service_provider = ServiceProvider::new(connection_manager);
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
                    facility_free_text: Some(NullableUpdate {
                        value: Some("Facility".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            result.vaccination_row.comment,
            Some("Updated comment".to_string())
        );
        assert_eq!(
            result.vaccination_row.facility_free_text,
            Some("Facility".to_string())
        );

        // ----------------------------
        // Update: Change stock line: Don't create transactions
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(true),
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_vaccine_item_a().id),
                    }),
                    update_transactions: Some(false),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.given, true);
        assert!(result.vaccination_row.invoice_id.is_none());

        // Check invoice was NOT created
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_vaccine_item_a().id),
            )
            .unwrap();
        assert_eq!(created_invoices.len(), 0);

        // Check stock was not adjusted
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // Should be unchanged, still 5.0
        assert_eq!(stock_line.available_number_of_packs, 5.0);

        // ----------------------------
        // Update: Given -> Not given
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
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.given, false);

        // ----------------------------
        // Update: Not given -> given, from another store
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_b().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    given: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(result.vaccination_row.given, true);
    }

    #[actix_rt::test]
    async fn update_vaccination_success_invoice_adjustments() {
        let (_, _, connection_manager, _) = setup_all(
            "update_vaccination_success_invoice_adjustments",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_vaccine_item_a().id),
                    }),
                    update_transactions: Some(true),
                    ..Default::default()
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
                    stock_line_id: Some(NullableUpdate {
                        value: Some(mock_stock_line_b_vaccine_item_a().id),
                    }),
                    update_transactions: Some(true),
                    ..Default::default()
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
            .any(|inv| inv.invoice_row.r#type == InvoiceType::Prescription
                && inv.invoice_row.is_cancellation));

        // Check new stock was introduced
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
        // Update: Remove stock_line (e.g. changing to `other` facility)
        // ----------------------------
        let result = service_provider
            .vaccination_service
            .update_vaccination(
                &context,
                &mock_store_a().id,
                UpdateVaccination {
                    id: mock_vaccination_a().id,
                    stock_line_id: Some(NullableUpdate { value: None }),
                    update_transactions: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        // Still given
        assert_eq!(result.vaccination_row.given, true);

        // New invoice has been created, inventory addition to reverse the original prescription
        let created_invoices = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new().stock_line_id(mock_stock_line_b_vaccine_item_a().id),
            )
            .unwrap();

        assert_eq!(created_invoices.len(), 2);
        assert!(created_invoices
            .iter()
            .any(|inv| inv.invoice_row.r#type == InvoiceType::Prescription
                && inv.invoice_row.is_cancellation));

        // Check stock was re-introduced
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&mock_stock_line_b_vaccine_item_a().id)
            .unwrap()
            .unwrap();
        // 1 dose was reversed, was 9.975, so 10.0 now
        assert_eq!(stock_line.available_number_of_packs, 10.0);

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
                    update_transactions: Some(true),
                    ..Default::default()
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

        // Already had the return, another one was not created
        assert_eq!(created_invoices.len(), 2);
    }
}
