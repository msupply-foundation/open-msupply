use chrono::NaiveDate;
use repository::{
    EqualFilter, GenderType, NameRow, NameRowRepository, NameRowType, Patient, PatientFilter,
    RepositoryError, StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

use super::patient_updated::patient_name;

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
    let Some(existing) = validate_patient_exists(con, input)? else {
        return Err(UpdatePatientError::PatientDoesNotExists);
    };

    if existing.r#type != NameRowType::Patient {
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
        address1,
        phone,
        is_deceased,
        date_of_death,
    } = update;

    NameRow {
        code,
        name: patient_name(&first_name, &last_name),
        first_name,
        last_name,
        gender,
        date_of_birth,
        address1,
        phone,
        date_of_death,
        is_deceased: is_deceased.unwrap_or(false),
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
    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub address1: Option<String>,
    pub phone: Option<String>,
    pub is_deceased: Option<bool>,
    pub date_of_death: Option<NaiveDate>,
}

pub(crate) fn update_patient(
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
                .map_err(UpdatePatientError::DatabaseError)?
                .rows
                .pop()
                .ok_or(UpdatePatientError::InternalError(
                    "Can't find the updated patient".to_string(),
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
