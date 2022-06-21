use chrono::Utc;
use repository::{DocumentRepository, EqualFilter, RepositoryError, TransactionError};

use crate::{
    document::{document_service::DocumentInsertError, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    patient_doc_name, patient_schema::SchemaPatient, Patient, PatientFilter, PATIENT_TYPE,
};

#[derive(PartialEq, Debug)]
pub enum UpdatePatientError {
    InvalidPatientId,
    InvalidParentId,
    PatientExists,
    InvalidDataSchema(Vec<String>),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdatePatient {
    pub data: serde_json::Value,
    pub schema_id: Option<String>,
    /// If the patient is new the parent is not set
    pub parent: Option<String>,
}

pub fn update_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: String,
    user_id: &str,
    input: UpdatePatient,
) -> Result<Patient, UpdatePatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let patient = validate(ctx, service_provider, &store_id, &input)?;
            let doc = generate(user_id, &patient, input);

            // Updating the document will trigger an update in the patient (names) table
            service_provider
                .document_service
                .update_document(ctx, &store_id, doc)
                .map_err(|err| match err {
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdatePatientError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdatePatientError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdatePatientError::InternalError(err)
                    }
                    _ => UpdatePatientError::InternalError(format!("{:?}", err)),
                })?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    &store_id,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&patient.id))),
                    None,
                )
                .map_err(|err| UpdatePatientError::DatabaseError(err))?
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

fn generate(user_id: &str, patient: &SchemaPatient, input: UpdatePatient) -> RawDocument {
    RawDocument {
        name: patient_doc_name(&patient.id),
        parents: vec![],
        author: user_id.to_string(),
        timestamp: Utc::now(),
        r#type: PATIENT_TYPE.to_string(),
        data: input.data,
        schema_id: input.schema_id,
    }
}

fn validate_patient_schema(input: &UpdatePatient) -> Result<SchemaPatient, UpdatePatientError> {
    let patient: SchemaPatient = serde_json::from_value(input.data.clone()).map_err(|err| {
        UpdatePatientError::InvalidDataSchema(vec![format!("Invalid patient data: {}", err)])
    })?;
    Ok(patient)
}

fn validate_patient_id(patient: &SchemaPatient) -> bool {
    if patient.id.is_empty() {
        return false;
    }
    true
}

fn validate_patient_not_exists(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    id: &str,
) -> Result<bool, RepositoryError> {
    let patient_name = patient_doc_name(id);
    let existing_document =
        service_provider
            .document_service
            .get_document(ctx, store_id, &patient_name)?;
    Ok(existing_document.is_none())
}

fn validate_parent(ctx: &ServiceContext, parent: &str) -> Result<bool, RepositoryError> {
    let parent_doc = DocumentRepository::new(&ctx.connection).find_one_by_id(parent)?;
    Ok(parent_doc.is_some())
}

fn validate(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: &UpdatePatient,
) -> Result<SchemaPatient, UpdatePatientError> {
    let patient = validate_patient_schema(input)?;
    if !validate_patient_id(&patient) {
        return Err(UpdatePatientError::InvalidPatientId);
    }

    match input.parent.clone() {
        None => {
            if !validate_patient_not_exists(ctx, service_provider, store_id, &patient.id)? {
                return Err(UpdatePatientError::PatientExists);
            }
        }
        Some(parent) => {
            if !validate_parent(ctx, &parent)? {
                return Err(UpdatePatientError::InvalidParentId);
            }
        }
    }

    Ok(patient)
}
