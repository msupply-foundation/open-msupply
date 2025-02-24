use chrono::{NaiveDateTime, Utc};
use repository::{
    Invoice, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
    RepositoryError, StockLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    activity_log::{activity_log_entry, log_type_from_invoice_status},
    invoice::query::get_invoice,
    service_provider::ServiceContext,
    NullableUpdate,
};

mod generate;
mod validate;
use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdatePrescriptionStatus {
    Picked,
    Verified,
    Cancelled,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdatePrescription {
    pub id: String,
    pub status: Option<UpdatePrescriptionStatus>,
    pub patient_id: Option<String>,
    pub clinician_id: Option<NullableUpdate<String>>,
    pub comment: Option<String>,
    pub colour: Option<String>,
    pub backdated_datetime: Option<NaiveDateTime>,
    pub diagnosis_id: Option<NullableUpdate<String>>,
    pub program_id: Option<NullableUpdate<String>>,
    pub their_reference: Option<NullableUpdate<String>>,
    pub name_insurance_join_id: Option<NullableUpdate<String>>,
    pub insurance_discount_amount: Option<f64>,
    pub insurance_discount_percentage: Option<f64>,
}

#[derive(Debug, PartialEq)]
pub enum UpdatePrescriptionError {
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAPrescriptionInvoice,
    NotThisStoreInvoice,
    ClinicianDoesNotExist,
    PatientDoesNotExist,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
    /// Can't backdate an invoice with allocated lines
    CantBackDate(String),
}

type OutError = UpdatePrescriptionError;

pub fn update_prescription(
    ctx: &ServiceContext,
    patch: UpdatePrescription,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, status_changed) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                lines_to_trim,
            } = generate(invoice, patch.clone(), connection)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);

            if let Some(stock_lines) = batches_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if let Some(lines) = lines_to_trim {
                for line in lines {
                    invoice_line_repo.delete(&line.id)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    log_type_from_invoice_status(&update_invoice.status, true),
                    Some(update_invoice.id.to_owned()),
                    None,
                    None,
                )?;

                if patch.status == Some(UpdatePrescriptionStatus::Cancelled) {
                    create_reverse_prescription(connection, &update_invoice)?;
                }
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

pub fn create_reverse_prescription(
    connection: &StorageConnection,
    orig_invoice: &InvoiceRow,
) -> Result<(), UpdatePrescriptionError> {
    // Create a new invoice row based on original invoice
    let mut new_invoice = orig_invoice.clone();

    new_invoice.id = uuid();
    new_invoice.linked_invoice_id = Some(orig_invoice.id.clone());
    new_invoice.is_cancellation = true;
    new_invoice.verified_datetime = Some(Utc::now().naive_utc());
    new_invoice.status = InvoiceStatus::Verified;
    InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

    // Fetch lines from original invoice
    let line_repo = InvoiceLineRowRepository::new(connection);
    let lines = line_repo.find_many_by_invoice_id(&orig_invoice.id)?;

    // Reverse the stock direction of each line and update DB
    for mut line in lines {
        line.id = uuid();
        line.invoice_id = new_invoice.id.clone();
        line.r#type = match line.r#type {
            repository::InvoiceLineType::StockOut => repository::InvoiceLineType::StockIn,
            _ => line.r#type,
        };
        line_repo.upsert_one(&line)?;
    }

    Ok(())
}

impl UpdatePrescriptionStatus {
    pub fn full_status(&self) -> InvoiceStatus {
        match self {
            UpdatePrescriptionStatus::Picked => InvoiceStatus::Picked,
            UpdatePrescriptionStatus::Verified => InvoiceStatus::Verified,
            UpdatePrescriptionStatus::Cancelled => InvoiceStatus::Cancelled,
        }
    }

    pub fn full_status_option(status: &Option<UpdatePrescriptionStatus>) -> Option<InvoiceStatus> {
        status.as_ref().map(|status| status.full_status())
    }
}

impl UpdatePrescription {
    pub fn full_status(&self) -> Option<InvoiceStatus> {
        self.status.as_ref().map(|status| status.full_status())
    }
}

impl From<RepositoryError> for UpdatePrescriptionError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrescriptionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_patient, mock_patient_b, mock_prescription_a,
            mock_prescription_verified, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        ActivityLogRowRepository, ActivityLogType, ClinicianRow, ClinicianStoreJoinRow,
        EqualFilter, InvoiceFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType,
        InvoiceRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
        StockLineRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::prescription::{UpdatePrescription, UpdatePrescriptionStatus},
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::UpdatePrescriptionError;

    type ServiceError = UpdatePrescriptionError;

    #[actix_rt::test]
    async fn update_prescription_errors() {
        fn prescription_no_stock() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = String::from("prescription_no_stock");
                r.name_link_id = String::from("name_store_a");
                r.store_id = String::from("store_a");
                r.r#type = InvoiceType::Prescription;
                r.status = InvoiceStatus::New;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 7)
                    .unwrap()
                    .and_hms_milli_opt(15, 30, 0, 0)
                    .unwrap();
                r.allocated_datetime = Some(
                    NaiveDate::from_ymd_opt(1970, 1, 7)
                        .unwrap()
                        .and_hms_milli_opt(15, 30, 0, 0)
                        .unwrap(),
                );
            })
        }

        fn invoice_line_no_stock() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = String::from("prescription_no_stock_line_a");
                r.invoice_id = String::from("prescription_no_stock");
                r.item_link_id = String::from("item_a");
                r.item_name = String::from("Item A");
                r.item_code = String::from("item_a_code");
                r.batch = None;
                r.r#type = InvoiceLineType::StockOut;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_prescription_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![prescription_no_stock()];
                r.invoice_lines = vec![invoice_line_no_stock()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| { r.id = "invalid".to_string() })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        // InvoiceIsNotEditable
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| {
                    r.id = mock_prescription_verified().id;
                    r.status = Some(UpdatePrescriptionStatus::Verified);
                })
            ),
            Err(ServiceError::InvoiceIsNotEditable)
        );
        // NotAPrescriptionInvoice
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| { r.id = mock_inbound_shipment_a().id })
            ),
            Err(ServiceError::NotAPrescriptionInvoice)
        );

        // InvoiceLineHasNoStockLine
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| {
                    r.id = prescription_no_stock().id;
                    r.status = Some(UpdatePrescriptionStatus::Picked);
                })
            ),
            Err(ServiceError::InvoiceLineHasNoStockLine(
                invoice_line_no_stock().id.clone()
            ))
        );

        // ClinicianDoesNotExist
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| {
                    r.id = prescription_no_stock().id;
                    r.clinician_id = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    })
                })
            ),
            Err(ServiceError::ClinicianDoesNotExist)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| {
                    r.id = mock_prescription_a().id;
                    r.status = Some(UpdatePrescriptionStatus::Picked);
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn update_prescription_success() {
        fn prescription() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "test_prescription_pricing".to_string();
                r.name_link_id = mock_patient().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceType::Prescription;
            })
        }
        fn clinician() -> ClinicianRow {
            inline_init(|r: &mut ClinicianRow| {
                r.id = "test_clinician".to_string();
                r.code = "test_clinician_code".to_string();
                r.last_name = "test_clinician_last_name".to_string();
                r.initials = "test_clinician_initials".to_string();
                r.is_active = true;
            })
        }
        fn clinician_store_join() -> ClinicianStoreJoinRow {
            ClinicianStoreJoinRow {
                id: "test_clinician_store_join".to_string(),
                store_id: mock_store_a().id,
                clinician_link_id: clinician().id,
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_prescription",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![prescription()];
                r.clinicians = vec![clinician()];
                r.clinician_store_joins = vec![clinician_store_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Test all fields apart from status
        fn get_update() -> UpdatePrescription {
            UpdatePrescription {
                id: prescription().id,
                status: None,
                patient_id: Some(mock_patient_b().id),
                clinician_id: Some(NullableUpdate {
                    value: Some(clinician().id),
                }),
                comment: Some("test_comment".to_string()),
                colour: Some("test_colour".to_string()),
                backdated_datetime: None,
                diagnosis_id: None,
                their_reference: None,
                program_id: None,
                name_insurance_join_id: None,
                insurance_discount_amount: None,
                insurance_discount_percentage: None,
            }
        }

        let result = service.update_prescription(&context, get_update());

        assert!(result.is_ok());

        let updated_record = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&prescription().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_record,
            inline_edit(&prescription(), |mut u| {
                let UpdatePrescription {
                    id: _,
                    status: _,
                    patient_id,
                    clinician_id,
                    comment,
                    colour,
                    backdated_datetime: _,
                    diagnosis_id: _,
                    program_id: _,
                    their_reference: _,
                    name_insurance_join_id: _,
                    insurance_discount_amount: _,
                    insurance_discount_percentage: _,
                } = get_update();
                u.name_link_id = patient_id.unwrap();
                u.clinician_link_id = clinician_id.unwrap().value;
                u.comment = comment;
                u.colour = colour;
                u
            })
        );

        // helpers to compare totals
        let stock_lines_for_invoice_lines = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_line_ids: Vec<String> = invoice_lines
                .iter()
                .filter_map(|invoice| invoice.stock_line_id.to_owned())
                .collect();
            StockLineRowRepository::new(&connection)
                .find_many_by_ids(&stock_line_ids)
                .unwrap()
        };
        // calculates the expected stock line total for every invoice line row
        let expected_stock_line_totals = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
            let expected_stock_line_totals: Vec<(StockLineRow, f64)> = stock_lines
                .into_iter()
                .map(|line| {
                    let invoice_line = invoice_lines
                        .iter()
                        .find(|il| il.stock_line_id.clone().unwrap() == line.id)
                        .unwrap();
                    let expected_total = line.total_number_of_packs - invoice_line.number_of_packs;
                    (line, expected_total)
                })
                .collect();
            expected_stock_line_totals
        };
        let assert_stock_line_totals =
            |invoice_lines: &Vec<InvoiceLineRow>, expected: &Vec<(StockLineRow, f64)>| {
                let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
                for line in stock_lines {
                    let expected = expected.iter().find(|l| l.0.id == line.id).unwrap();
                    assert_eq!(line.total_number_of_packs, expected.1);
                }
            };

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&prescription().id)
            .unwrap()
            .unwrap();
        let invoice_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();
        let expected_stock_line_totals = expected_stock_line_totals(&invoice_lines);

        service
            .update_prescription(
                &context,
                inline_init(|r: &mut UpdatePrescription| {
                    r.id = prescription().id;
                    r.status = Some(UpdatePrescriptionStatus::Picked);
                }),
            )
            .unwrap();
        assert_stock_line_totals(&invoice_lines, &expected_stock_line_totals);

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&prescription().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::PrescriptionStatusPicked)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::PrescriptionStatusPicked);

        // Test that cancellation of prescription generates reverse invoice

        // Should only be able to set Status to "Cancelled" from "Verified".
        // This is not currently enforced on server, but doing it here to
        // prevent future tests failing.
        let result = service.update_prescription(
            &context,
            inline_init(|r: &mut UpdatePrescription| {
                r.id = prescription().id;
                r.status = Some(UpdatePrescriptionStatus::Verified);
            }),
        );
        assert!(result.is_ok());
        let result = service.update_prescription(
            &context,
            inline_init(|r: &mut UpdatePrescription| {
                r.id = prescription().id;
                r.status = Some(UpdatePrescriptionStatus::Cancelled);
            }),
        );
        assert!(result.is_ok());

        let reverse_prescription = InvoiceRepository::new(&connection)
            .query_one(
                InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&prescription().id)),
            )
            .unwrap()
            .unwrap()
            .invoice_row;
        assert_eq!(reverse_prescription.is_cancellation, true);

        let reverse_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&reverse_prescription.id);
        assert_eq!(reverse_lines.iter().len(), 1);
    }
}
