use chrono::NaiveDate;
use repository::{
    EqualFilter, Gender, NameRow, NameRowRepository, NameType, Patient, PatientFilter,
    RepositoryError, StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

#[derive(PartialEq, Debug)]
pub enum UpdateNamePatientError {
    PatientDoesNotExists,
    NotAPatient,
    InternalError(String),
    DatabaseError(RepositoryError),
}

fn validate_patient_exists(
    con: &StorageConnection,
    input: &UpdateNamePatient,
) -> Result<Option<NameRow>, RepositoryError> {
    NameRowRepository::new(con).find_one_by_id(&input.id)
}

fn validate(
    con: &StorageConnection,
    input: &UpdateNamePatient,
) -> Result<NameRow, UpdateNamePatientError> {
    let Some(existing) = validate_patient_exists(con, &input)? else {
        return Err(UpdateNamePatientError::PatientDoesNotExists);
    };

    if existing.r#type != NameType::Patient {
        return Err(UpdateNamePatientError::NotAPatient);
    }

    Ok(existing)
}

fn generate(mut existing: NameRow, update: UpdateNamePatient) -> NameRow {
    let UpdateNamePatient {
        id: _,
        code,
        code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
    } = update;
    existing.code = code;
    existing.national_health_number = code_2;
    existing.first_name = first_name;
    existing.last_name = last_name;
    existing.gender = gender;
    existing.date_of_birth = date_of_birth;

    existing
}

#[derive(Default)]
pub struct UpdateNamePatient {
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
    input: UpdateNamePatient,
) -> Result<Patient, UpdateNamePatientError> {
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
                .map_err(|err| UpdateNamePatientError::DatabaseError(err))?
                .rows
                .pop()
                .ok_or(UpdateNamePatientError::InternalError(
                    "Can't find the just inserted patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<UpdateNamePatientError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdateNamePatientError {
    fn from(err: RepositoryError) -> Self {
        UpdateNamePatientError::DatabaseError(err)
    }
}
