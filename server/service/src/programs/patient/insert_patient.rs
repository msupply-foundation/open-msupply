use chrono::Utc;
use repository::{
    EqualFilter, NameRow, NameRowRepository, NameType, Patient, PatientFilter, RepositoryError,
    StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

use super::patient_updated::create_patient_name_store_join;

#[derive(PartialEq, Debug)]
pub enum InsertPatientError {
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

fn validate(con: &StorageConnection, input: &NameRow) -> Result<(), InsertPatientError> {
    if input.r#type != NameType::Patient {
        return Err(InsertPatientError::NotAPatient);
    }

    if !validate_patient_does_not_exist(con, input)? {
        return Err(InsertPatientError::PatientExists);
    }
    Ok(())
}

fn generate(input: NameRow) -> NameRow {
    NameRow {
        created_datetime: Some(input.created_datetime.unwrap_or(Utc::now().naive_utc())),
        ..input
    }
}

pub(crate) fn insert_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: NameRow,
) -> Result<Patient, InsertPatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            validate(con, &input)?;
            let row = generate(input);

            let name_repo = NameRowRepository::new(con);
            name_repo.upsert_one(&row)?;
            create_patient_name_store_join(&con, store_id, &row.id)?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&row.id))),
                    None,
                    None,
                )
                .map_err(|err| InsertPatientError::DatabaseError(err))?
                .rows
                .pop()
                .ok_or(InsertPatientError::InternalError(
                    "Can't find the just inserted patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<InsertPatientError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for InsertPatientError {
    fn from(err: RepositoryError) -> Self {
        InsertPatientError::DatabaseError(err)
    }
}
