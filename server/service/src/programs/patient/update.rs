use chrono::Utc;
use repository::{
    DocumentStatus, EqualFilter, NameFilter, NameRepository, RepositoryError, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    main_patient_doc_name, patient_schema::SchemaPatient,
    patient_updated::patient_document_updated, Patient, PatientFilter, PATIENT_TYPE,
};

#[derive(PartialEq, Debug)]
pub enum UpdatePatientError {
    InvalidPatientId,
    InvalidParentId,
    PatientExists,
    InvalidDataSchema(Vec<String>),
    PatientDoesNotBelongToStore,
    DataSchemaDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdatePatient {
    pub data: serde_json::Value,
    pub schema_id: String,
    /// If the patient is new the parent is not set
    pub parent: Option<String>,
}

pub fn update_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    user_id: &str,
    input: UpdatePatient,
) -> Result<Patient, UpdatePatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let patient = validate(ctx, service_provider, store_id, &input)?;
            let patient_id = patient.id.clone();
            let doc = generate(user_id, &patient, input)?;
            let doc_timestamp = doc.timestamp.clone();
            if is_latest_doc(ctx, service_provider, &doc)
                .map_err(UpdatePatientError::DatabaseError)?
            {
                // update the names table
                patient_document_updated(&ctx.connection, store_id, &doc_timestamp, patient)?;
            }

            // Updating the document will trigger an update in the patient (names) table
            service_provider
                .document_service
                .update_document(ctx, doc, &vec![PATIENT_TYPE.to_string()])
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpdatePatientError::InternalError(
                            "Wrong params for update_document".to_string(),
                        )
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdatePatientError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdatePatientError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdatePatientError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpdatePatientError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => UpdatePatientError::InvalidParentId,
                })?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    store_id,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&patient_id))),
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

fn generate(
    user_id: &str,
    patient: &SchemaPatient,
    input: UpdatePatient,
) -> Result<RawDocument, RepositoryError> {
    Ok(RawDocument {
        name: main_patient_doc_name(&patient.id),
        parents: input.parent.map(|p| vec![p]).unwrap_or(vec![]),
        author: user_id.to_string(),
        timestamp: Utc::now(),
        r#type: PATIENT_TYPE.to_string(),
        data: input.data,
        schema_id: Some(input.schema_id),
        status: DocumentStatus::Active,
        comment: None,
        patient_id: Some(patient.id.clone()),
    })
}

fn validate_patient_schema(input: &UpdatePatient) -> Result<SchemaPatient, UpdatePatientError> {
    // Check that we can parse the data into a default Patient object, i.e. that it's following the
    // default patient JSON schema.
    // If the patient data uses a derived patient schema, the derived schema is validated in the
    // document service.
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
    id: &str,
) -> Result<bool, RepositoryError> {
    let patient_name = main_patient_doc_name(id);
    let existing_document =
        service_provider
            .document_service
            .get_document(ctx, &patient_name, None)?;
    Ok(existing_document.is_none())
}

fn patient_belongs_to_store(
    ctx: &ServiceContext,
    store_id: &str,
    patient_id: &str,
) -> Result<bool, UpdatePatientError> {
    let name = NameRepository::new(&ctx.connection)
        .query_one(
            store_id,
            NameFilter::new().id(EqualFilter::equal_to(patient_id)),
        )?
        .unwrap_or_default();
    Ok(name.is_visible())
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

    if input.parent.is_none() {
        if !validate_patient_not_exists(ctx, service_provider, &patient.id)? {
            return Err(UpdatePatientError::PatientExists);
        }
    }

    if input.parent.is_some() && !patient_belongs_to_store(ctx, store_id, &patient.id)? {
        return Err(UpdatePatientError::PatientDoesNotBelongToStore);
    }
    Ok(patient)
}

#[cfg(test)]
pub mod test {
    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentFilter, DocumentRepository, FormSchemaRowRepository, StringFilter,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::{
        programs::patient::{
            main_patient_doc_name,
            patient_schema::{ContactDetails, Gender, SchemaPatient},
        },
        service_provider::ServiceProvider,
    };

    use super::UpdatePatientError;

    pub fn mock_patient_1() -> SchemaPatient {
        let contact_details = ContactDetails {
            description: None,
            email: Some("myemail".to_string()),
            mobile: Some("45678".to_string()),
            phone: None,
            website: Some("mywebsite".to_string()),
            address_1: Some("firstaddressline".to_string()),
            address_2: Some("secondaddressline".to_string()),
            city: None,
            country: Some("mycountry".to_string()),
            district: None,
            region: None,
            zip_code: None,
        };
        inline_init(|p: &mut SchemaPatient| {
            p.id = "testId".to_string();
            p.code = Some("national_id".to_string());
            p.contact_details = vec![contact_details.clone()];
            p.date_of_birth = Some("2000-03-04".to_string());
            p.first_name = Some("firstname".to_string());
            p.last_name = Some("lastname".to_string());
            p.gender = Some(Gender::TransgenderFemale);
        })
    }

    #[actix_rt::test]
    async fn test_patient_update() {
        let (_, _, connection_manager, _) = setup_all(
            "test_patient_update",
            MockDataInserts::none()
                .names()
                .stores()
                .form_schemas()
                .name_store_joins(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.basic_context().unwrap();

        // dummy schema
        let schema = mock_form_schema_empty();
        FormSchemaRowRepository::new(&ctx.connection)
            .upsert_one(&schema)
            .unwrap();

        let patient = mock_patient_1();

        let service = &service_provider.patient_service;
        let err = service
            .update_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                super::UpdatePatient {
                    data: json!({"invalid": true}),
                    // TODO use a valid patient schema id
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .err()
            .unwrap();
        matches!(err, UpdatePatientError::InvalidDataSchema(_));

        // success insert
        let inserted_patient = service
            .update_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                super::UpdatePatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();

        // PatientDoesNotBelongToStore
        let err = service
            .update_patient(
                &ctx,
                &service_provider,
                "store_b",
                "user",
                super::UpdatePatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: Some(inserted_patient.name_row.id),
                },
            )
            .err()
            .unwrap();
        matches!(err, UpdatePatientError::PatientDoesNotBelongToStore);

        assert_eq!(
            service
                .update_patient(
                    &ctx,
                    &service_provider,
                    "store_a",
                    "user",
                    super::UpdatePatient {
                        data: serde_json::to_value(patient.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: None,
                    },
                )
                .err()
                .unwrap(),
            UpdatePatientError::PatientExists,
        );

        assert_eq!(
            service
                .update_patient(
                    &ctx,
                    &service_provider,
                    "store_a",
                    "user",
                    super::UpdatePatient {
                        data: serde_json::to_value(patient.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: Some("invalid".to_string()),
                    },
                )
                .err()
                .unwrap(),
            UpdatePatientError::InvalidParentId
        );

        // success update
        let v0 = DocumentRepository::new(&ctx.connection)
            .query(Some(DocumentFilter::new().name(StringFilter::equal_to(
                &main_patient_doc_name(&patient.id),
            ))))
            .unwrap()
            .pop()
            .unwrap();
        service
            .update_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                super::UpdatePatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: Some(v0.id),
                },
            )
            .unwrap();
    }
}
