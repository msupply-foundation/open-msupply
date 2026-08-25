use chrono::{NaiveDateTime, Utc};
use repository::{
    ActivityLogType, ClinicianRowRepository, ClinicianRowRepositoryTrait,
    PrescriptionOrderLineRowRepository, PrescriptionOrderRow, PrescriptionOrderRowRepository,
    PrescriptionOrderStatus, RepositoryError, TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::custom_field::{apply_custom_fields_patch, check_unknown_custom_field_key};
use crate::service_provider::ServiceContext;
use crate::validate::check_patient_exists;
use crate::NullableUpdate;

use super::generate::create_dispensation;
use super::validate::{check_prescription_order_editable, CommonPrescriptionOrderError};

/// Scope prescription_order custom_fields are configured under (see
/// `custom_field_scope.scope`).
pub const PRESCRIPTION_ORDER_CUSTOM_FIELD_SCOPE: &str = "prescription_order";

#[derive(Debug, Clone, PartialEq)]
pub enum UpdatePrescriptionOrderStatus {
    /// Locks the order and generates the dispensing invoice. `Dispensed` is
    /// never set through this input — the status processor flips it when the
    /// generated dispensation is verified.
    ReadyToDispense,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpdatePrescriptionOrder {
    pub id: String,
    pub patient_id: Option<String>,
    pub clinician_id: Option<NullableUpdate<String>>,
    pub diagnosis_id: Option<NullableUpdate<String>>,
    pub program_id: Option<NullableUpdate<String>>,
    pub prescription_datetime: Option<NaiveDateTime>,
    pub comment: Option<NullableUpdate<String>>,
    /// Patch of customFields key -> value merged into
    /// `prescription_order.custom_fields` (a JSON `null` deletes that key; keys
    /// absent from the patch are left as-is). Keys must be visible for the
    /// "prescription_order" scope.
    pub custom_fields: Option<serde_json::Map<String, serde_json::Value>>,
    pub status: Option<UpdatePrescriptionOrderStatus>,
}

#[derive(Debug, PartialEq)]
pub enum UpdatePrescriptionOrderError {
    PrescriptionOrderDoesNotExist,
    NotThisStorePrescriptionOrder,
    /// Only New orders can be edited or set to Ready to dispense.
    NotEditable,
    PatientDoesNotExist,
    ClinicianDoesNotExist,
    UnknownCustomFieldKey(String),
    /// Ready to dispense with no lines would generate an empty dispensation.
    NoLines,
    /// The generated dispensing invoice could not be created.
    CreatedDispensationError(String),
    DatabaseError(RepositoryError),
}

pub fn update_prescription_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePrescriptionOrder,
) -> Result<PrescriptionOrderRow, UpdatePrescriptionOrderError> {
    use UpdatePrescriptionOrderError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let existing = check_prescription_order_editable(connection, store_id, &input.id)
                .map_err(|error| match error {
                    CommonPrescriptionOrderError::DoesNotExist => PrescriptionOrderDoesNotExist,
                    CommonPrescriptionOrderError::NotThisStorePrescriptionOrder => {
                        NotThisStorePrescriptionOrder
                    }
                    CommonPrescriptionOrderError::NotEditable => NotEditable,
                    CommonPrescriptionOrderError::DatabaseError(e) => DatabaseError(e),
                })?;

            if let Some(patient_id) = &input.patient_id {
                if check_patient_exists(connection, patient_id)?.is_none() {
                    return Err(PatientDoesNotExist);
                }
            }
            if let Some(NullableUpdate {
                value: Some(clinician_id),
            }) = &input.clinician_id
            {
                ClinicianRowRepository::new(connection)
                    .find_one_by_id(clinician_id)?
                    .ok_or(ClinicianDoesNotExist)?;
            }
            if let Some(patch) = &input.custom_fields {
                if let Some(unknown_key) = check_unknown_custom_field_key(
                    connection,
                    PRESCRIPTION_ORDER_CUSTOM_FIELD_SCOPE,
                    patch,
                )? {
                    return Err(UnknownCustomFieldKey(unknown_key));
                }
            }

            let UpdatePrescriptionOrder {
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

            let mut updated = PrescriptionOrderRow {
                patient_id: patient_id.unwrap_or(existing.patient_id.clone()),
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

            let set_ready = matches!(status, Some(UpdatePrescriptionOrderStatus::ReadyToDispense));
            if set_ready {
                let lines = PrescriptionOrderLineRowRepository::new(connection)
                    .find_many_by_prescription_order_id(&updated.id)?;
                if lines.is_empty() {
                    return Err(NoLines);
                }

                updated.status = PrescriptionOrderStatus::ReadyToDispense;
                updated.ready_datetime = Some(Utc::now().naive_utc());

                // The dispensation copies the freshly-updated header, so write
                // the order first, then generate.
                PrescriptionOrderRowRepository::new(connection).upsert_one(&updated)?;
                create_dispensation(ctx, connection, &updated, lines)?;

                activity_log_entry(
                    ctx,
                    ActivityLogType::PrescriptionOrderReadyToDispense,
                    Some(updated.id.clone()),
                    Some(format!("{:?}", PrescriptionOrderStatus::New)),
                    Some(format!("{:?}", PrescriptionOrderStatus::ReadyToDispense)),
                )?;
            } else {
                PrescriptionOrderRowRepository::new(connection).upsert_one(&updated)?;
            }

            Ok(updated)
        })
        .map_err(|error: TransactionError<UpdatePrescriptionOrderError>| error.to_inner_error())
}

impl From<RepositoryError> for UpdatePrescriptionOrderError {
    fn from(error: RepositoryError) -> Self {
        UpdatePrescriptionOrderError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_patient, MockDataInserts},
        test_db::setup_all,
        EqualFilter, InvoiceFilter, InvoiceLineRowRepository, InvoiceLineType, InvoiceRepository,
        InvoiceStatus, InvoiceType, PrescriptionOrderStatus,
    };
    use util::uuid::uuid;

    use crate::prescription_order::delete::DeletePrescriptionOrderError;
    use crate::prescription_order::insert::InsertPrescriptionOrder;
    use crate::prescription_order_line::upsert::UpsertPrescriptionOrderLine;
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

    fn new_order(service_provider: &ServiceProvider, ctx: &ServiceContext) -> PrescriptionOrderRow {
        service_provider
            .prescription_order_service
            .insert_prescription_order(
                ctx,
                "store_a",
                InsertPrescriptionOrder {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    ..Default::default()
                },
            )
            .unwrap()
    }

    fn add_line(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        order_id: &str,
        quantity: f64,
        note: Option<&str>,
    ) {
        service_provider
            .prescription_order_line_service
            .upsert_prescription_order_line(
                ctx,
                "store_a",
                UpsertPrescriptionOrderLine {
                    id: uuid(),
                    prescription_order_id: order_id.to_string(),
                    item_id: mock_item_a().id,
                    quantity,
                    note: note.map(|n| n.to_string()),
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn ready_to_dispense_generates_dispensation() {
        let (service_provider, ctx) = setup("ready_to_dispense_generates_dispensation").await;

        let order = new_order(&service_provider, &ctx);
        assert_eq!(order.status, PrescriptionOrderStatus::New);
        assert_eq!(order.prescription_order_number, 1);

        // No lines yet: refuse to convert
        assert_eq!(
            service_provider
                .prescription_order_service
                .update_prescription_order(
                    &ctx,
                    "store_a",
                    UpdatePrescriptionOrder {
                        id: order.id.clone(),
                        status: Some(UpdatePrescriptionOrderStatus::ReadyToDispense),
                        ..Default::default()
                    },
                ),
            Err(UpdatePrescriptionOrderError::NoLines)
        );

        add_line(
            &service_provider,
            &ctx,
            &order.id,
            15.0,
            Some("one three times a day"),
        );

        let updated = service_provider
            .prescription_order_service
            .update_prescription_order(
                &ctx,
                "store_a",
                UpdatePrescriptionOrder {
                    id: order.id.clone(),
                    status: Some(UpdatePrescriptionOrderStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updated.status, PrescriptionOrderStatus::ReadyToDispense);
        assert!(updated.ready_datetime.is_some());

        // A New dispensing invoice linked back to the order was generated
        let invoice = InvoiceRepository::new(&ctx.connection)
            .query_one(
                InvoiceFilter::new()
                    .prescription_order_id(EqualFilter::equal_to(order.id.to_string())),
            )
            .unwrap()
            .expect("generated dispensation not found");
        assert_eq!(invoice.invoice_row.r#type, InvoiceType::Prescription);
        assert_eq!(invoice.invoice_row.status, InvoiceStatus::New);
        assert_eq!(invoice.invoice_row.name_id, mock_patient().id);

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

        // Order and its lines are locked after conversion
        assert_eq!(
            service_provider
                .prescription_order_service
                .update_prescription_order(
                    &ctx,
                    "store_a",
                    UpdatePrescriptionOrder {
                        id: order.id.clone(),
                        comment: Some(NullableUpdate {
                            value: Some("too late".to_string()),
                        }),
                        ..Default::default()
                    },
                ),
            Err(UpdatePrescriptionOrderError::NotEditable)
        );

        // ...and no longer deletable
        assert_eq!(
            service_provider
                .prescription_order_service
                .delete_prescription_order(&ctx, "store_a", order.id.clone()),
            Err(DeletePrescriptionOrderError::NotEditable)
        );
    }

    #[actix_rt::test]
    async fn delete_only_while_new() {
        let (service_provider, ctx) = setup("prescription_order_delete_only_while_new").await;

        let order = new_order(&service_provider, &ctx);
        add_line(&service_provider, &ctx, &order.id, 5.0, None);

        // New order (with lines) deletes fine
        service_provider
            .prescription_order_service
            .delete_prescription_order(&ctx, "store_a", order.id.clone())
            .unwrap();
        assert_eq!(
            PrescriptionOrderRowRepository::new(&ctx.connection)
                .find_one_by_id(&order.id)
                .unwrap(),
            None
        );
    }
}
