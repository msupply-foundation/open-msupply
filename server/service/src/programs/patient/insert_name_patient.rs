use chrono::Utc;
use repository::{
    EqualFilter, NameRow, NameRowRepository, NameType, Patient, PatientFilter, RepositoryError,
    StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

#[derive(PartialEq, Debug)]
pub enum InsertNamePatientError {
    PatientExists,
    NotAPatient,
    InternalError(String),
    DatabaseError(RepositoryError),
}

fn validate_patient_does_not_exist(
    con: &StorageConnection,
    input: &NameRow,
) -> Result<bool, RepositoryError> {
    let existing = NameRowRepository::new(con).find_one_by_id(&input.id)?;
    Ok(existing.is_none())
}

fn validate(con: &StorageConnection, input: &NameRow) -> Result<(), InsertNamePatientError> {
    if input.r#type != NameType::Patient {
        return Err(InsertNamePatientError::NotAPatient);
    }

    if !validate_patient_does_not_exist(con, input)? {
        return Err(InsertNamePatientError::PatientExists);
    }
    Ok(())
}

fn generate(input: NameRow) -> NameRow {
    NameRow {
        created_datetime: Some(input.created_datetime.unwrap_or(Utc::now().naive_utc())),
        ..input
    }
}

pub(crate) fn insert_name_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: NameRow,
) -> Result<Patient, InsertNamePatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            validate(con, &input)?;
            let row = generate(input);

            let name_repo = NameRowRepository::new(con);
            name_repo.upsert_one(&row)?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&row.id))),
                    None,
                    None,
                )
                .map_err(|err| InsertNamePatientError::DatabaseError(err))?
                .rows
                .pop()
                .ok_or(InsertNamePatientError::InternalError(
                    "Can't find the just inserted patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<InsertNamePatientError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for InsertNamePatientError {
    fn from(err: RepositoryError) -> Self {
        InsertNamePatientError::DatabaseError(err)
    }
}
