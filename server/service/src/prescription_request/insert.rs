use chrono::{NaiveDateTime, Utc};
use repository::{
    ActivityLogType, NumberRowType, PrescriptionRequestRow, PrescriptionRequestRowRepository,
    PrescriptionRequestStatus, RepositoryError, TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::number::next_number;
use crate::service_provider::ServiceContext;
use crate::validate::check_patient_exists;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertPrescriptionRequest {
    pub id: String,
    pub patient_id: String,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub prescription_datetime: Option<NaiveDateTime>,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionRequestError {
    PrescriptionRequestAlreadyExists,
    PatientDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_prescription_request(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertPrescriptionRequest,
) -> Result<PrescriptionRequestRow, InsertPrescriptionRequestError> {
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
                diagnosis_id: input.diagnosis_id,
                program_id: input.program_id,
                created_datetime: current_datetime,
                prescription_datetime: input.prescription_datetime.unwrap_or(current_datetime),
                ready_datetime: None,
                dispensed_datetime: None,
                // The sole record of who prescribed — there is no clinician
                // picker (spec/prescription-requests § who prescribed).
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

            Ok(row)
        })
        .map_err(|error: TransactionError<InsertPrescriptionRequestError>| error.to_inner_error())
}

impl From<RepositoryError> for InsertPrescriptionRequestError {
    fn from(error: RepositoryError) -> Self {
        InsertPrescriptionRequestError::DatabaseError(error)
    }
}
