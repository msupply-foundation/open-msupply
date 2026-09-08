use chrono::{NaiveDateTime, Utc};
use repository::{
    ActivityLogType, NumberRowType, PrescriptionRequest, PrescriptionRequestRow,
    PrescriptionRequestRowRepository, PrescriptionRequestStatus, RepositoryError, TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::number::next_number;
use crate::service_provider::ServiceContext;
use crate::validate::check_patient_exists;

use super::query::get_prescription_request;
use super::validate::{check_clinician_exists, check_diagnosis_exists};
use crate::common::check_program_exists;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertPrescriptionRequest {
    pub id: String,
    pub patient_id: String,
    /// The clinician the request is written on behalf of — optional, and NOT a
    /// record of who entered it (that is the session's user).
    pub clinician_id: Option<String>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub prescription_datetime: Option<NaiveDateTime>,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionRequestError {
    PrescriptionRequestAlreadyExists,
    PatientDoesNotExist,
    ClinicianDoesNotExist,
    DiagnosisDoesNotExist,
    ProgramDoesNotExist,
    /// The row was written but could not be read back — internal.
    NewlyCreatedPrescriptionRequestDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_prescription_request(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertPrescriptionRequest,
) -> Result<PrescriptionRequest, InsertPrescriptionRequestError> {
    use InsertPrescriptionRequestError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let repo = PrescriptionRequestRowRepository::new(connection);
            if repo.find_one_by_id(&input.id)?.is_some() {
                return Err(PrescriptionRequestAlreadyExists);
            }
            if check_patient_exists(connection, &input.patient_id)?.is_none() {
                return Err(PatientDoesNotExist);
            }
            if let Some(clinician_id) = &input.clinician_id {
                if !check_clinician_exists(connection, clinician_id)? {
                    return Err(ClinicianDoesNotExist);
                }
            }
            if let Some(diagnosis_id) = &input.diagnosis_id {
                if !check_diagnosis_exists(connection, diagnosis_id)? {
                    return Err(DiagnosisDoesNotExist);
                }
            }
            if let Some(program_id) = &input.program_id {
                if check_program_exists(connection, program_id)?.is_none() {
                    return Err(ProgramDoesNotExist);
                }
            }

            let current_datetime = Utc::now().naive_utc();
            let row = PrescriptionRequestRow {
                id: input.id,
                store_id: store_id.to_string(),
                prescription_request_number: next_number(
                    connection,
                    &NumberRowType::PrescriptionRequest,
                    store_id,
                )?,
                status: PrescriptionRequestStatus::New,
                patient_id: input.patient_id,
                // A clinician's own id doubles as its link id until a merge
                // repoints the link — the same convention every other
                // clinician reference is written under.
                clinician_link_id: input.clinician_id,
                diagnosis_id: input.diagnosis_id,
                program_id: input.program_id,
                created_datetime: current_datetime,
                prescription_datetime: input.prescription_datetime.unwrap_or(current_datetime),
                ready_datetime: None,
                dispensed_datetime: None,
                // Who ENTERED the request — a different fact from the
                // clinician above, and never presented as the prescriber
                // (spec/prescription-requests § who is recorded).
                created_by: ctx.user_id.clone(),
                comment: None,
                custom_fields: None,
            };
            repo.upsert_one(&row)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionRequestCreated,
                Some(row.id.clone()),
                None,
                None,
            )?;

            // Read back joined, so the response carries the clinician resolved
            // through its link rather than the raw link id.
            get_prescription_request(ctx, Some(store_id), &row.id)?
                .ok_or(NewlyCreatedPrescriptionRequestDoesNotExist)
        })
        .map_err(|error: TransactionError<InsertPrescriptionRequestError>| error.to_inner_error())
}

impl From<RepositoryError> for InsertPrescriptionRequestError {
    fn from(error: RepositoryError) -> Self {
        InsertPrescriptionRequestError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{clinician_a, mock_patient, MockDataInserts},
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn insert_prescription_request_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_prescription_request_errors", MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        let service = &service_provider.prescription_request_service;

        let valid = InsertPrescriptionRequest {
            id: uuid(),
            patient_id: mock_patient().id,
            ..Default::default()
        };

        // PatientDoesNotExist
        assert_eq!(
            service.insert_prescription_request(
                &ctx,
                "store_a",
                InsertPrescriptionRequest {
                    patient_id: "does not exist".to_string(),
                    ..valid.clone()
                }
            ),
            Err(InsertPrescriptionRequestError::PatientDoesNotExist)
        );

        // ClinicianDoesNotExist — caught here rather than as an opaque FK error
        assert_eq!(
            service.insert_prescription_request(
                &ctx,
                "store_a",
                InsertPrescriptionRequest {
                    clinician_id: Some("does not exist".to_string()),
                    ..valid.clone()
                }
            ),
            Err(InsertPrescriptionRequestError::ClinicianDoesNotExist)
        );

        // DiagnosisDoesNotExist — caught here rather than as an opaque FK error
        assert_eq!(
            service.insert_prescription_request(
                &ctx,
                "store_a",
                InsertPrescriptionRequest {
                    diagnosis_id: Some("does not exist".to_string()),
                    ..valid.clone()
                }
            ),
            Err(InsertPrescriptionRequestError::DiagnosisDoesNotExist)
        );

        // ProgramDoesNotExist
        assert_eq!(
            service.insert_prescription_request(
                &ctx,
                "store_a",
                InsertPrescriptionRequest {
                    program_id: Some("does not exist".to_string()),
                    ..valid.clone()
                }
            ),
            Err(InsertPrescriptionRequestError::ProgramDoesNotExist)
        );

        // PrescriptionRequestAlreadyExists
        service
            .insert_prescription_request(&ctx, "store_a", valid.clone())
            .unwrap();
        assert_eq!(
            service.insert_prescription_request(&ctx, "store_a", valid),
            Err(InsertPrescriptionRequestError::PrescriptionRequestAlreadyExists)
        );
    }

    /// The clinician is a field of the request, set at creation, and comes
    /// back RESOLVED — not as the link id it is stored under (issue #513).
    #[actix_rt::test]
    async fn insert_prescription_request_keeps_the_clinician() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_prescription_request_keeps_the_clinician",
            MockDataInserts::all(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();

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
            .unwrap();

        assert_eq!(
            request.clinician_row.map(|clinician| clinician.id),
            Some(clinician_a().id)
        );
        // The entering account stays its own, separate fact.
        assert_eq!(
            request.prescription_request_row.created_by,
            "user_account_a"
        );
    }
}
