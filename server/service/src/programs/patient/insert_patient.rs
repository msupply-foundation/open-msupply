use chrono::{NaiveDate, Utc};
use repository::{
    EqualFilter, GenderType, NameRow, NameRowRepository, NameRowType, Patient, PatientFilter,
    RepositoryError, StorageConnection, TransactionError,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

use super::patient_updated::{create_patient_name_store_join, patient_name};

#[derive(Default)]
pub struct InsertPatient {
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
    pub r#type: NameRowType,
}

#[derive(PartialEq, Debug)]
pub enum InsertPatientError {
    PatientExists,
    NotAPatient,
    InternalError(String),
    DatabaseError(RepositoryError),
}

fn validate_patient_does_not_exist(
    con: &StorageConnection,
    input: &InsertPatient,
) -> Result<bool, RepositoryError> {
    let existing = NameRowRepository::new(con).find_one_by_id(&input.id)?;
    Ok(existing.is_none())
}

fn validate(con: &StorageConnection, input: &InsertPatient) -> Result<(), InsertPatientError> {
    if input.r#type != NameRowType::Patient {
        return Err(InsertPatientError::NotAPatient);
    }

    if !validate_patient_does_not_exist(con, input)? {
        return Err(InsertPatientError::PatientExists);
    }
    Ok(())
}

fn generate(input: InsertPatient, store_id: &str) -> NameRow {
    let InsertPatient {
        id,
        code,
        code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
        address1,
        phone,
        date_of_death,
        is_deceased,
        r#type,
    } = input;

    NameRow {
        id,
        name: patient_name(&first_name, &last_name),
        code,
        r#type,
        is_customer: true,
        is_supplier: false,
        supplying_store_id: Some(store_id.to_string()),
        first_name,
        last_name,
        gender,
        date_of_birth,
        address1,
        phone,
        date_of_death,
        is_deceased: is_deceased.unwrap_or(false),
        national_health_number: code_2,
        created_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    }
}

pub(crate) fn insert_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertPatient,
) -> Result<Patient, InsertPatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|con| {
            validate(con, &input)?;
            let row = generate(input, store_id);

            let name_repo = NameRowRepository::new(con);
            name_repo.upsert_one(&row)?;
            create_patient_name_store_join(con, store_id, &row.id)?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&row.id))),
                    None,
                    None,
                )
                .map_err(InsertPatientError::DatabaseError)?
                .rows
                .pop()
                .ok_or(InsertPatientError::InternalError(
                    "Can't find the newly created patient".to_string(),
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
