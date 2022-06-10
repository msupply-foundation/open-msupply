use chrono::Utc;
use repository::{EqualFilter, RepositoryError};
use util::uuid::uuid;

use crate::{
    document::{document_service::DocumentInsertError, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    patient_doc_name, patient_schema::SchemaPatient, Patient, PatientFilter, PATIENT_TYPE,
};

#[derive(PartialEq, Debug)]
pub enum InsertPatientError {
    InvalidDataSchema(Vec<String>),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct InsertPatient {
    pub data: serde_json::Value,
    pub schema_id: Option<String>,
}

pub fn insert_patients(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: String,
    user_id: &str,
    input: InsertPatient,
) -> Result<Patient, InsertPatientError> {
    let new_patient_id = uuid();

    // update patient id
    let mut patient: SchemaPatient = serde_json::from_value(input.data).map_err(|err| {
        InsertPatientError::InvalidDataSchema(vec![format!("Invalid patient data: {}", err)])
    })?;
    patient.id = new_patient_id.clone();
    let patient_data = serde_json::to_value(&patient)
        .map_err(|err| InsertPatientError::InternalError(format!("{:?}", err)))?;

    let doc = RawDocument {
        name: patient_doc_name(&new_patient_id),
        parents: vec![],
        author: user_id.to_string(),
        timestamp: Utc::now(),
        r#type: PATIENT_TYPE.to_string(),
        data: patient_data,
        schema_id: input.schema_id,
    };
    // Updating the document will trigger an update in the patient (names) table

    service_provider
        .document_service
        .update_document(ctx, &store_id, doc)
        .map_err(|err| match err {
            DocumentInsertError::InvalidDataSchema(err) => {
                InsertPatientError::InvalidDataSchema(err)
            }
            DocumentInsertError::DatabaseError(err) => InsertPatientError::DatabaseError(err),
            DocumentInsertError::InternalError(err) => InsertPatientError::InternalError(err),
            _ => InsertPatientError::InternalError(format!("{:?}", err)),
        })?;

    let patient = service_provider
        .patient_service
        .get_patients(
            ctx,
            &store_id,
            None,
            Some(PatientFilter::new().id(EqualFilter::equal_to(&new_patient_id))),
            None,
        )
        .map_err(|err| InsertPatientError::DatabaseError(err))?
        .pop()
        .ok_or(InsertPatientError::InternalError(
            "Can't find the just inserted patient".to_string(),
        ))?;
    Ok(patient)
}
