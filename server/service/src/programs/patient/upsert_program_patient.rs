use chrono::Utc;
use repository::{
    DocumentRegistry, DocumentRegistryCategory, DocumentRegistryFilter, DocumentRegistryRepository,
    DocumentStatus, EqualFilter, RepositoryError, TransactionError,
};
use util::constants::PATIENT_TYPE;

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    main_patient_doc_name,
    patient_schema::SchemaPatient,
    patient_updated::{create_patient_name_store_join, update_patient_row},
    Patient, PatientFilter,
};

#[derive(PartialEq, Debug)]
pub enum UpdateProgramPatientError {
    InvalidPatientId,
    InvalidParentId,
    PatientExists,
    InvalidDataSchema(Vec<String>),
    PatientDocumentRegistryDoesNotExit,
    DataSchemaDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdateProgramPatient {
    pub data: serde_json::Value,
    pub schema_id: String,
    /// If the patient is new the parent is not set
    pub parent: Option<String>,
}

pub fn upsert_program_patient(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    user_id: &str,
    input: UpdateProgramPatient,
) -> Result<Patient, UpdateProgramPatientError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let (patient, registry) = validate(ctx, service_provider, &input)?;
            let patient_id = patient.id.clone();
            let doc = generate(user_id, &patient, registry, input)?;
            let doc_timestamp = doc.datetime.clone();

            // Update the name first because the doc is referring the name id
            if is_latest_doc(&ctx.connection, &doc.name, doc.datetime)
                .map_err(UpdateProgramPatientError::DatabaseError)?
            {
                update_patient_row(
                    &ctx.connection,
                    Some(store_id.to_string()),
                    &doc_timestamp,
                    patient,
                )?;
                create_patient_name_store_join(&ctx.connection, store_id, &patient_id)?;
            }

            service_provider
                .document_service
                .update_document(ctx, doc, &vec![PATIENT_TYPE.to_string()])
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpdateProgramPatientError::InternalError(
                            "Wrong params for update_document".to_string(),
                        )
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdateProgramPatientError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdateProgramPatientError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdateProgramPatientError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpdateProgramPatientError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => {
                        UpdateProgramPatientError::InvalidParentId
                    }
                })?;

            let patient = service_provider
                .patient_service
                .get_patients(
                    ctx,
                    None,
                    Some(PatientFilter::new().id(EqualFilter::equal_to(&patient_id))),
                    None,
                    None,
                )
                .map_err(|err| UpdateProgramPatientError::DatabaseError(err))?
                .rows
                .pop()
                .ok_or(UpdateProgramPatientError::InternalError(
                    "Can't find the just inserted patient".to_string(),
                ))?;
            Ok(patient)
        })
        .map_err(|err: TransactionError<UpdateProgramPatientError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdateProgramPatientError {
    fn from(err: RepositoryError) -> Self {
        UpdateProgramPatientError::DatabaseError(err)
    }
}

fn generate(
    user_id: &str,
    patient: &SchemaPatient,
    registry: DocumentRegistry,
    input: UpdateProgramPatient,
) -> Result<RawDocument, RepositoryError> {
    Ok(RawDocument {
        name: main_patient_doc_name(&patient.id),
        parents: input.parent.map(|p| vec![p]).unwrap_or(vec![]),
        author: user_id.to_string(),
        datetime: Utc::now(),
        r#type: PATIENT_TYPE.to_string(),
        data: input.data,
        form_schema_id: Some(input.schema_id),
        status: DocumentStatus::Active,
        owner_name_id: Some(patient.id.clone()),
        context_id: registry.context_id,
    })
}

fn validate_patient_schema(
    input: &UpdateProgramPatient,
) -> Result<SchemaPatient, UpdateProgramPatientError> {
    // Check that we can parse the data into a default Patient object, i.e. that it's following the
    // default patient JSON schema.
    // If the patient data uses a derived patient schema, the derived schema is validated in the
    // document service.
    let patient: SchemaPatient = serde_json::from_value(input.data.clone()).map_err(|err| {
        UpdateProgramPatientError::InvalidDataSchema(vec![format!("Invalid patient data: {}", err)])
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
    let existing_document = service_provider
        .document_service
        .document(ctx, &patient_name, None)?;
    Ok(existing_document.is_none())
}

fn validate_document_type(
    ctx: &ServiceContext,
) -> Result<Option<DocumentRegistry>, RepositoryError> {
    let mut entry = DocumentRegistryRepository::new(&ctx.connection).query_by_filter(
        DocumentRegistryFilter::new()
            .r#type(DocumentRegistryCategory::Patient.equal_to())
            .document_type(EqualFilter::equal_to(PATIENT_TYPE)),
    )?;
    Ok(entry.pop())
}

fn validate(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: &UpdateProgramPatient,
) -> Result<(SchemaPatient, DocumentRegistry), UpdateProgramPatientError> {
    let patient = validate_patient_schema(input)?;
    if !validate_patient_id(&patient) {
        return Err(UpdateProgramPatientError::InvalidPatientId);
    }

    let document_registry = match validate_document_type(ctx)? {
        Some(document_registry) => document_registry,
        None => return Err(UpdateProgramPatientError::PatientDocumentRegistryDoesNotExit),
    };

    if input.parent.is_none() && !validate_patient_not_exists(ctx, service_provider, &patient.id)? {
        return Err(UpdateProgramPatientError::PatientExists);
    }

    Ok((patient, document_registry))
}

#[cfg(test)]
pub mod test {
    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentFilter, DocumentRegistryCategory, DocumentRegistryRow,
        DocumentRegistryRowRepository, DocumentRepository, EqualFilter, FormSchemaRowRepository,
        Pagination, PatientFilter, PatientRepository, StringFilter,
    };
    use serde_json::json;
    use util::{
        constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE},
        inline_init,
    };

    use crate::{
        programs::patient::{
            main_patient_doc_name,
            patient_schema::{ContactDetails, Gender, SchemaPatient},
            upsert_program_patient,
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateProgramPatientError;

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
            p.id = "updatePatientId1".to_string();
            p.code = Some("national_id".to_string());
            p.contact_details = Some(vec![contact_details.clone()]);
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

        let registry_repo = DocumentRegistryRowRepository::new(&ctx.connection);
        registry_repo
            .upsert_one(&DocumentRegistryRow {
                id: "patient_id".to_string(),
                category: DocumentRegistryCategory::Patient,
                document_type: PATIENT_TYPE.to_string(),
                context_id: PATIENT_CONTEXT_ID.to_string(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
            })
            .unwrap();

        let patient = mock_patient_1();

        let service = &service_provider.patient_service;
        let err = service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                upsert_program_patient::UpdateProgramPatient {
                    data: json!({"invalid": true}),
                    // TODO use a valid patient schema id
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .err()
            .unwrap();
        matches!(err, UpdateProgramPatientError::InvalidDataSchema(_));

        // success insert
        assert!(PatientRepository::new(&ctx.connection)
            .query_by_filter(
                PatientFilter::new().id(EqualFilter::equal_to(&patient.id)),
                None
            )
            .unwrap()
            .pop()
            .is_none());
        service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                upsert_program_patient::UpdateProgramPatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();
        PatientRepository::new(&ctx.connection)
            .query_by_filter(
                PatientFilter::new().id(EqualFilter::equal_to(&patient.id)),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(
            service
                .upsert_program_patient(
                    &ctx,
                    &service_provider,
                    "store_a",
                    "user",
                    upsert_program_patient::UpdateProgramPatient {
                        data: serde_json::to_value(patient.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: None,
                    },
                )
                .err()
                .unwrap(),
            UpdateProgramPatientError::PatientExists,
        );

        assert_eq!(
            service
                .upsert_program_patient(
                    &ctx,
                    &service_provider,
                    "store_a",
                    "user",
                    upsert_program_patient::UpdateProgramPatient {
                        data: serde_json::to_value(patient.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: Some("invalid".to_string()),
                    },
                )
                .err()
                .unwrap(),
            UpdateProgramPatientError::InvalidParentId
        );

        // success update
        let v0 = DocumentRepository::new(&ctx.connection)
            .query(
                Pagination::one(),
                Some(
                    DocumentFilter::new()
                        .name(StringFilter::equal_to(&main_patient_doc_name(&patient.id))),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                "user",
                upsert_program_patient::UpdateProgramPatient {
                    data: serde_json::to_value(patient.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: Some(v0.id),
                },
            )
            .unwrap();
    }
}
