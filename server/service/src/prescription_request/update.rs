use chrono::{NaiveDateTime, Utc};
use repository::{
    ActivityLogType, CustomFieldValueType, PrescriptionRequest,
    PrescriptionRequestLineRowRepository, PrescriptionRequestRow, PrescriptionRequestRowRepository,
    PrescriptionRequestStatus, RepositoryError, TransactionError,
};

use crate::activity_log::{activity_log_entry, activity_log_entry_with_diff};
use crate::common::check_program_exists;
use crate::custom_field::{
    apply_custom_fields_patch, check_custom_fields_patch, CustomFieldPatchProblem,
};
use crate::service_provider::ServiceContext;
use crate::validate::check_patient_exists;
use crate::NullableUpdate;

use super::generate::create_dispensation;
use super::query::get_prescription_request;
use super::validate::{
    check_clinician_exists, check_diagnosis_exists, check_prescription_request_editable,
    CommonPrescriptionRequestError,
};

/// Scope prescription_request custom_fields are configured under (see
/// `custom_field_scope.scope`).
pub const PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE: &str = "prescription_request";

#[derive(Debug, Clone, PartialEq)]
pub enum UpdatePrescriptionRequestStatus {
    /// Locks the request and generates the dispensing invoice. `Dispensed` is
    /// never set through this input — the status processor flips it when the
    /// generated dispensation is verified.
    ///
    /// It carries no clinician: the request holds its own, chosen when it was
    /// created, and that is what the dispensation is filled from (issue #513).
    ReadyToDispense,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpdatePrescriptionRequest {
    pub id: String,
    pub patient_id: Option<String>,
    pub clinician_id: Option<NullableUpdate<String>>,
    pub diagnosis_id: Option<NullableUpdate<String>>,
    pub program_id: Option<NullableUpdate<String>>,
    pub prescription_datetime: Option<NaiveDateTime>,
    pub comment: Option<NullableUpdate<String>>,
    /// Patch of customFields key -> value merged into
    /// `prescription_request.custom_fields` (a JSON `null` deletes that key; keys
    /// absent from the patch are left as-is). Keys must be visible for the
    /// "prescription_request" scope.
    pub custom_fields: Option<serde_json::Map<String, serde_json::Value>>,
    pub status: Option<UpdatePrescriptionRequestStatus>,
}

#[derive(Debug, PartialEq)]
pub enum UpdatePrescriptionRequestError {
    PrescriptionRequestDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Only New requests can be edited or set to Ready to dispense.
    NotEditable,
    PatientDoesNotExist,
    ClinicianDoesNotExist,
    DiagnosisDoesNotExist,
    ProgramDoesNotExist,
    UnknownCustomFieldKey(String),
    /// A custom-field patch gives a defined key a value of the wrong shape for
    /// its value type.
    InvalidCustomFieldValue {
        key: String,
        expected: CustomFieldValueType,
    },
    /// Ready to dispense with no lines would generate an empty dispensation.
    NoLines,
    /// The generated dispensing invoice could not be created.
    CreatedDispensationError(String),
    /// The row was written but could not be read back — internal.
    UpdatedPrescriptionRequestDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<CustomFieldPatchProblem> for UpdatePrescriptionRequestError {
    fn from(problem: CustomFieldPatchProblem) -> Self {
        match problem {
            CustomFieldPatchProblem::UnknownKey(key) => {
                UpdatePrescriptionRequestError::UnknownCustomFieldKey(key)
            }
            CustomFieldPatchProblem::WrongValueType { key, expected } => {
                UpdatePrescriptionRequestError::InvalidCustomFieldValue { key, expected }
            }
        }
    }
}

pub fn update_prescription_request(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePrescriptionRequest,
) -> Result<PrescriptionRequest, UpdatePrescriptionRequestError> {
    use UpdatePrescriptionRequestError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let existing = check_prescription_request_editable(connection, store_id, &input.id)
                .map_err(|error| match error {
                    CommonPrescriptionRequestError::DoesNotExist => PrescriptionRequestDoesNotExist,
                    CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                        NotThisStorePrescriptionRequest
                    }
                    CommonPrescriptionRequestError::NotEditable => NotEditable,
                    CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
                })?;

            if let Some(patient_id) = &input.patient_id {
                if check_patient_exists(connection, patient_id)?.is_none() {
                    return Err(PatientDoesNotExist);
                }
            }
            // Only a patch that names one gets checked; clearing it (a
            // NullableUpdate holding None) has nothing to look up.
            if let Some(clinician_id) = input.clinician_id.as_ref().and_then(|u| u.value.as_ref()) {
                if !check_clinician_exists(connection, clinician_id)? {
                    return Err(ClinicianDoesNotExist);
                }
            }
            if let Some(diagnosis_id) = input.diagnosis_id.as_ref().and_then(|u| u.value.as_ref()) {
                if !check_diagnosis_exists(connection, diagnosis_id)? {
                    return Err(DiagnosisDoesNotExist);
                }
            }
            if let Some(program_id) = input.program_id.as_ref().and_then(|u| u.value.as_ref()) {
                if check_program_exists(connection, program_id)?.is_none() {
                    return Err(ProgramDoesNotExist);
                }
            }
            if let Some(patch) = &input.custom_fields {
                if let Some(problem) = check_custom_fields_patch(
                    connection,
                    PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE,
                    patch,
                )? {
                    return Err(problem.into());
                }
            }

            let UpdatePrescriptionRequest {
                id: _,
                patient_id,
                clinician_id,
                diagnosis_id,
                program_id,
                prescription_datetime,
                comment,
                custom_fields,
                status,
            } = input;

            let mut updated = PrescriptionRequestRow {
                patient_id: patient_id.unwrap_or(existing.patient_id.clone()),
                // Written as the link id, under the same convention as the
                // insert: a clinician's own id is its link id until a merge.
                clinician_link_id: clinician_id
                    .map(|u| u.value)
                    .unwrap_or(existing.clinician_link_id.clone()),
                diagnosis_id: diagnosis_id
                    .map(|u| u.value)
                    .unwrap_or(existing.diagnosis_id.clone()),
                program_id: program_id
                    .map(|u| u.value)
                    .unwrap_or(existing.program_id.clone()),
                prescription_datetime: prescription_datetime
                    .unwrap_or(existing.prescription_datetime),
                comment: comment.map(|u| u.value).unwrap_or(existing.comment.clone()),
                custom_fields: apply_custom_fields_patch(
                    existing.custom_fields.clone(),
                    custom_fields,
                ),
                ..existing.clone()
            };

            // What an edit changed, before the status transition below adds its
            // own fields to the row — so this records the header the user
            // touched and the transition is logged as itself. Writes nothing
            // when nothing differs, so a no-op update leaves no trace.
            //
            // A request records who CREATED it, and until this there was no
            // record that anyone else had touched it since.
            activity_log_entry_with_diff(
                ctx,
                ActivityLogType::PrescriptionRequestUpdated,
                Some(updated.id.clone()),
                Some(&existing),
                &updated,
            )?;

            if let Some(UpdatePrescriptionRequestStatus::ReadyToDispense) = status {
                let lines = PrescriptionRequestLineRowRepository::new(connection)
                    .find_many_by_prescription_request_id(&updated.id)?;
                if lines.is_empty() {
                    return Err(NoLines);
                }

                updated.status = PrescriptionRequestStatus::ReadyToDispense;
                updated.ready_datetime = Some(Utc::now().naive_utc());

                // The dispensation copies the freshly-updated header, so write
                // the request first, then generate.
                PrescriptionRequestRowRepository::new(connection).upsert_one(&updated)?;
                create_dispensation(ctx, connection, &updated, lines)?;

                activity_log_entry(
                    ctx,
                    ActivityLogType::PrescriptionRequestReadyToDispense,
                    Some(updated.id.clone()),
                    Some(format!("{:?}", PrescriptionRequestStatus::New)),
                    Some(format!("{:?}", PrescriptionRequestStatus::ReadyToDispense)),
                )?;
            } else {
                PrescriptionRequestRowRepository::new(connection).upsert_one(&updated)?;
            }

            // Read back joined, so the response carries the clinician resolved
            // through its link rather than the raw link id.
            get_prescription_request(ctx, Some(store_id), &updated.id)?
                .ok_or(UpdatedPrescriptionRequestDoesNotExist)
        })
        .map_err(|error: TransactionError<UpdatePrescriptionRequestError>| error.to_inner_error())
}

impl From<RepositoryError> for UpdatePrescriptionRequestError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrescriptionRequestError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{clinician_a, mock_item_a, mock_patient, mock_patient_b, MockDataInserts},
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, EqualFilter, InvoiceFilter,
        InvoiceLineRowRepository, InvoiceLineType, InvoiceRepository, InvoiceStatus, InvoiceType,
        PrescriptionRequestStatus,
    };
    use util::uuid::uuid;

    use crate::invoice::prescription::{
        DeletePrescriptionError, UpdatePrescription, UpdatePrescriptionError,
    };
    use crate::invoice_line::stock_out_line::{
        SetPrescribedQuantity, SetPrescribedQuantityError,
    };
    use crate::prescription_request::batch::BatchPrescriptionRequest;
    use crate::prescription_request::delete::DeletePrescriptionRequestError;
    use crate::prescription_request::insert::InsertPrescriptionRequest;
    use crate::prescription_request_line::upsert::UpsertPrescriptionRequestLine;
    use crate::service_provider::{ServiceContext, ServiceProvider};

    use super::*;

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    fn new_request(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
    ) -> PrescriptionRequestRow {
        service_provider
            .prescription_request_service
            .insert_prescription_request(
                ctx,
                "store_a",
                InsertPrescriptionRequest {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    ..Default::default()
                },
            )
            .unwrap()
            .prescription_request_row
    }

    fn add_line(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        request_id: &str,
        number_of_units: f64,
        note: Option<&str>,
    ) {
        service_provider
            .prescription_request_line_service
            .upsert_prescription_request_line(
                ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    id: uuid(),
                    prescription_request_id: request_id.to_string(),
                    item_id: mock_item_a().id,
                    number_of_units,
                    note: note.map(|n| n.to_string()),
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn ready_to_dispense_generates_dispensation() {
        let (service_provider, ctx) = setup("ready_to_dispense_generates_dispensation").await;

        let request = new_request(&service_provider, &ctx);
        assert_eq!(request.status, PrescriptionRequestStatus::New);
        assert_eq!(request.prescription_request_number, 1);

        // No lines yet: refuse to convert
        assert_eq!(
            service_provider
                .prescription_request_service
                .update_prescription_request(
                    &ctx,
                    "store_a",
                    UpdatePrescriptionRequest {
                        id: request.id.clone(),
                        status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                        ..Default::default()
                    },
                ),
            Err(UpdatePrescriptionRequestError::NoLines)
        );

        add_line(
            &service_provider,
            &ctx,
            &request.id,
            15.0,
            Some("one three times a day"),
        );

        // The clinician is the request's own field, set while it is still New
        // — the hand-over takes no clinician of its own (issue #513).
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    clinician_id: Some(NullableUpdate {
                        value: Some(clinician_a().id),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        let updated = service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap()
            .prescription_request_row;
        assert_eq!(updated.status, PrescriptionRequestStatus::ReadyToDispense);
        assert!(updated.ready_datetime.is_some());

        // A New dispensing invoice linked back to the request was generated
        let invoice = InvoiceRepository::new(&ctx.connection)
            .query_one(
                InvoiceFilter::new()
                    .prescription_request_id(EqualFilter::equal_to(request.id.to_string())),
            )
            .unwrap()
            .expect("generated dispensation not found");
        assert_eq!(invoice.invoice_row.r#type, InvoiceType::Prescription);
        assert_eq!(invoice.invoice_row.status, InvoiceStatus::New);
        assert_eq!(invoice.invoice_row.name_id, mock_patient().id);
        // The clinician the REQUEST names fills the dispensation's own
        // clinician field.
        assert_eq!(
            invoice.invoice_row.clinician_link_id,
            Some(clinician_a().id)
        );

        // ...with one unallocated line carrying the prescribed quantity + directions
        let lines = InvoiceLineRowRepository::new(&ctx.connection)
            .find_many_by_invoice_id(&invoice.invoice_row.id)
            .unwrap();
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].r#type, InvoiceLineType::UnallocatedStock);
        assert_eq!(lines[0].prescribed_quantity, Some(15.0));
        assert_eq!(lines[0].note.as_deref(), Some("one three times a day"));
        assert_eq!(lines[0].item_id, mock_item_a().id);
        assert_eq!(lines[0].number_of_packs, 0.0);

        // Request and its lines are locked after conversion
        assert_eq!(
            service_provider
                .prescription_request_service
                .update_prescription_request(
                    &ctx,
                    "store_a",
                    UpdatePrescriptionRequest {
                        id: request.id.clone(),
                        comment: Some(NullableUpdate {
                            value: Some("too late".to_string()),
                        }),
                        ..Default::default()
                    },
                ),
            Err(UpdatePrescriptionRequestError::NotEditable)
        );

        // ...and no longer deletable
        assert_eq!(
            service_provider
                .prescription_request_service
                .delete_prescription_request(&ctx, "store_a", request.id.clone()),
            Err(DeletePrescriptionRequestError::NotEditable)
        );
    }

    /// A request records who CREATED it, so without this nothing said that
    /// anyone else had touched it since.
    #[actix_rt::test]
    async fn an_edit_is_recorded_and_a_no_op_is_not() {
        let (service_provider, ctx) = setup("prescription_request_edit_is_logged").await;
        let request = new_request(&service_provider, &ctx);

        let updates = |id: &str| {
            ActivityLogRowRepository::new(&ctx.connection)
                .find_many_by_record_id(id)
                .unwrap()
                .into_iter()
                .filter(|log| log.r#type == ActivityLogType::PrescriptionRequestUpdated)
                .collect::<Vec<_>>()
        };

        assert!(updates(&request.id).is_empty(), "creation is not an edit");

        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    comment: Some(NullableUpdate {
                        value: Some("second thoughts".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        let logged = updates(&request.id);
        assert_eq!(logged.len(), 1, "an edit was not recorded");
        // The diff names what changed, not merely that something did
        let to = logged[0].changed_to.clone().unwrap();
        assert!(
            to.contains("second thoughts"),
            "the log did not carry the new value: {to}"
        );

        // Submitting the same values again changes nothing, so records nothing
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    comment: Some(NullableUpdate {
                        value: Some("second thoughts".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updates(&request.id).len(), 1, "a no-op update was recorded");
    }

    /// The generated dispensation is the request's only route to being
    /// dispensed, so the dispensary cannot delete it out from under the
    /// prescriber — otherwise the request sits on Ready to dispense forever.
    #[actix_rt::test]
    async fn generated_dispensation_cannot_be_deleted() {
        let (service_provider, ctx) = setup("generated_dispensation_cannot_be_deleted").await;

        let request = new_request(&service_provider, &ctx);
        add_line(&service_provider, &ctx, &request.id, 5.0, None);
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRepository::new(&ctx.connection)
            .query_one(
                InvoiceFilter::new()
                    .prescription_request_id(EqualFilter::equal_to(request.id.to_string())),
            )
            .unwrap()
            .expect("generated dispensation not found");
        // It is New, so the ordinary editable check would have let it through
        assert_eq!(invoice.invoice_row.status, InvoiceStatus::New);

        assert_eq!(
            service_provider
                .invoice_service
                .delete_prescription(&ctx, invoice.invoice_row.id.clone()),
            Err(DeletePrescriptionError::CannotDeleteGeneratedDispensation)
        );
        assert!(InvoiceRepository::new(&ctx.connection)
            .query_one(
                InvoiceFilter::new().id(EqualFilter::equal_to(invoice.invoice_row.id.to_string()))
            )
            .unwrap()
            .is_some());
    }

    /// The prescriber's fields are locked on the dispensation the hand-over
    /// generated — enforced by the server, not just withheld by the UI
    /// (issue #513). Re-sending an unchanged value is not a change and passes.
    #[actix_rt::test]
    async fn generated_dispensation_locks_the_prescribers_fields() {
        let (service_provider, ctx) = setup("generated_dispensation_locks_fields").await;

        // A request carrying all three of the fields at stake.
        let request = service_provider
            .prescription_request_service
            .insert_prescription_request(
                &ctx,
                "store_a",
                InsertPrescriptionRequest {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    clinician_id: Some(clinician_a().id),
                    ..Default::default()
                },
            )
            .unwrap()
            .prescription_request_row;
        add_line(&service_provider, &ctx, &request.id, 5.0, None);
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRepository::new(&ctx.connection)
            .query_one(
                InvoiceFilter::new()
                    .prescription_request_id(EqualFilter::equal_to(request.id.to_string())),
            )
            .unwrap()
            .expect("generated dispensation not found");
        let invoice_id = invoice.invoice_row.id.clone();
        // New, so the ordinary editable check would have let all of these through.
        assert_eq!(invoice.invoice_row.status, InvoiceStatus::New);

        let update = |input: UpdatePrescription| {
            service_provider.invoice_service.update_prescription(
                &ctx,
                UpdatePrescription {
                    id: invoice_id.clone(),
                    ..input
                },
            )
        };

        assert_eq!(
            update(UpdatePrescription {
                patient_id: Some(mock_patient_b().id),
                ..Default::default()
            })
            .map(|_| ()),
            Err(UpdatePrescriptionError::CannotChangePrescriberField("patient"))
        );
        assert_eq!(
            update(UpdatePrescription {
                clinician_id: Some(NullableUpdate { value: None }),
                ..Default::default()
            })
            .map(|_| ()),
            Err(UpdatePrescriptionError::CannotChangePrescriberField(
                "clinician"
            ))
        );
        assert_eq!(
            update(UpdatePrescription {
                // Refused before anything looks the id up — the guard runs
                // ahead of the write, and nothing validates a diagnosis here.
                diagnosis_id: Some(NullableUpdate {
                    value: Some("any-diagnosis".to_string())
                }),
                ..Default::default()
            })
            .map(|_| ()),
            Err(UpdatePrescriptionError::CannotChangePrescriberField(
                "diagnosis"
            ))
        );

        // Re-sending what it already holds is not a change: it passes, and so
        // does an ordinary edit alongside it. A client that echoes unchanged
        // fields is not refused for fields it never touched.
        assert!(update(UpdatePrescription {
            patient_id: Some(mock_patient().id),
            clinician_id: Some(NullableUpdate {
                value: Some(clinician_a().id)
            }),
            comment: Some("dispenser's note".to_string()),
            ..Default::default()
        })
        .is_ok());

        // The program is NOT the prescriber's: re-scoping the catalogue stays
        // the dispenser's decision.
        assert!(update(UpdatePrescription {
            program_id: Some(NullableUpdate { value: None }),
            ..Default::default()
        })
        .is_ok());

        // The prescribed quantity is the prescriber's too, and is written
        // through its own mutation rather than the header's.
        let set_prescribed = |quantity: f64| {
            service_provider.invoice_line_service.set_prescribed_quantity(
                &ctx,
                SetPrescribedQuantity {
                    invoice_id: invoice_id.clone(),
                    item_id: mock_item_a().id,
                    prescribed_quantity: quantity,
                },
            )
        };

        assert_eq!(
            set_prescribed(99.0).map(|_| ()),
            Err(SetPrescribedQuantityError::CannotChangePrescribedQuantity)
        );
        // Re-sending the prescriber's own figure passes — BOTH front ends echo
        // it back on every line save of the item, so refusing on mention would
        // break allocation on exactly the records this protects.
        assert!(set_prescribed(5.0).is_ok());
    }

    /// A selection holding one request that cannot go takes none of them.
    #[actix_rt::test]
    async fn batch_delete_is_all_or_nothing() {
        let (service_provider, ctx) = setup("prescription_request_batch_delete_atomic").await;

        let deletable = new_request(&service_provider, &ctx);
        let handed_over = new_request(&service_provider, &ctx);
        add_line(&service_provider, &ctx, &handed_over.id, 5.0, None);
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: handed_over.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap();

        let result = service_provider
            .prescription_request_service
            .batch_prescription_request(
                &ctx,
                "store_a",
                BatchPrescriptionRequest {
                    delete: Some(vec![deletable.id.clone(), handed_over.id.clone()]),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            result.delete[1].result,
            Err(DeletePrescriptionRequestError::NotEditable)
        );
        // The rollback means the deletable one is still there too
        let repo = PrescriptionRequestRowRepository::new(&ctx.connection);
        assert!(repo.find_one_by_id(&deletable.id).unwrap().is_some());
        assert!(repo.find_one_by_id(&handed_over.id).unwrap().is_some());
    }

    #[actix_rt::test]
    async fn delete_only_while_new() {
        let (service_provider, ctx) = setup("prescription_request_delete_only_while_new").await;

        let request = new_request(&service_provider, &ctx);
        add_line(&service_provider, &ctx, &request.id, 5.0, None);

        // New request (with lines) deletes fine
        service_provider
            .prescription_request_service
            .delete_prescription_request(&ctx, "store_a", request.id.clone())
            .unwrap();
        assert_eq!(
            PrescriptionRequestRowRepository::new(&ctx.connection)
                .find_one_by_id(&request.id)
                .unwrap(),
            None
        );
    }
}
