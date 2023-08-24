use chrono::NaiveDate;
use repository::{
    EqualFilter, Gender, NameRow, NameRowRepository, NameType, Patient, PatientFilter,
    RepositoryError, StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

#[derive(PartialEq, Debug)]
pub enum UpdatePatientError {
    PatientDoesNotExists,
    NotAPatient,
    InternalError(String),
    DatabaseError(RepositoryError),
}

fn validate_patient_exists(
    con: &StorageConnection,
    input: &UpdatePatient,
) -> Result<Option<NameRow>, RepositoryError> {
    NameRowRepository::new(con).find_one_by_id(&input.id)
}

fn validate(con: &StorageConnection, input: &UpdatePatient) -> Result<NameRow, UpdatePatientError> {
    let Some(existing) = validate_patient_exists(con, &input)? else {
        return Err(UpdatePatientError::PatientDoesNotExists);
    };

    if existing.r#type != NameType::Patient {
        return Err(UpdatePatientError::NotAPatient);
    }

    Ok(existing)
}

fn generate(existing: NameRow, update: UpdatePatient) -> NameRow {
    let UpdatePatient {
        id: _,
        code,
        code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
    } = update;

    NameRow {
        code,
        first_name,
        last_name,
        gender,
        date_of_birth,
        national_health_number: code_2,
        ..existing
    }
}

#[derive(Default)]
pub struct UpdatePatient {
    pub id: String,
    pub code: String,
    pub code_2: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<Gender>,
    pub date_of_birth: Option<NaiveDate>,
}

pub(crate) fn update_name_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: UpdatePatient,
) -> Result<Patient, UpdatePatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            let existing = validate(con, &input)?;
            let row = generate(existing, input);

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
                .map_err(|err| UpdatePatientError::DatabaseError(err))?
                .rows
                .pop()
                .ok_or(UpdatePatientError::InternalError(
                    "Can't find the just inserted patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<UpdatePatientError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdatePatientError {
    fn from(err: RepositoryError) -> Self {
        UpdatePatientError::DatabaseError(err)
    }
}
