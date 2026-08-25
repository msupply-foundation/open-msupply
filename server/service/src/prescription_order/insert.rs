use chrono::{NaiveDateTime, Utc};
use repository::{
    ActivityLogType, ClinicianRowRepository, ClinicianRowRepositoryTrait, NumberRowType,
    PrescriptionOrderRow, PrescriptionOrderRowRepository, PrescriptionOrderStatus, RepositoryError,
    TransactionError,
};

use crate::activity_log::activity_log_entry;
use crate::number::next_number;
use crate::service_provider::ServiceContext;
use crate::validate::check_patient_exists;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertPrescriptionOrder {
    pub id: String,
    pub patient_id: String,
    pub clinician_id: Option<String>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub prescription_datetime: Option<NaiveDateTime>,
}

#[derive(Debug, PartialEq)]
pub enum InsertPrescriptionOrderError {
    PrescriptionOrderAlreadyExists,
    PatientDoesNotExist,
    ClinicianDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_prescription_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertPrescriptionOrder,
) -> Result<PrescriptionOrderRow, InsertPrescriptionOrderError> {
    use InsertPrescriptionOrderError::*;

    ctx.connection
        .transaction_sync(|connection| {
            let repo = PrescriptionOrderRowRepository::new(connection);
            if repo.find_one_by_id(&input.id)?.is_some() {
                return Err(PrescriptionOrderAlreadyExists);
            }
            if check_patient_exists(connection, &input.patient_id)?.is_none() {
                return Err(PatientDoesNotExist);
            }
            if let Some(clinician_id) = &input.clinician_id {
                ClinicianRowRepository::new(connection)
                    .find_one_by_id(clinician_id)?
                    .ok_or(ClinicianDoesNotExist)?;
            }

            let current_datetime = Utc::now().naive_utc();
            let row = PrescriptionOrderRow {
                id: input.id,
                store_id: store_id.to_string(),
                prescription_order_number: next_number(
                    connection,
                    &NumberRowType::PrescriptionOrder,
                    store_id,
                )?,
                status: PrescriptionOrderStatus::New,
                patient_id: input.patient_id,
                clinician_link_id: input.clinician_id,
                diagnosis_id: input.diagnosis_id,
                program_id: input.program_id,
                created_datetime: current_datetime,
                prescription_datetime: input.prescription_datetime.unwrap_or(current_datetime),
                ready_datetime: None,
                dispensed_datetime: None,
                created_by: ctx.user_id.clone(),
                comment: None,
                custom_fields: None,
            };
            repo.upsert_one(&row)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PrescriptionOrderCreated,
                Some(row.id.clone()),
                None,
                None,
            )?;

            Ok(row)
        })
        .map_err(|error: TransactionError<InsertPrescriptionOrderError>| error.to_inner_error())
}

impl From<RepositoryError> for InsertPrescriptionOrderError {
    fn from(error: RepositoryError) -> Self {
        InsertPrescriptionOrderError::DatabaseError(error)
    }
}
