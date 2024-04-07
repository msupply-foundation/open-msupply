use chrono::Utc;
use repository::{
    Document, DocumentRegistry, DocumentRegistryCategory, DocumentRegistryFilter,
    DocumentRegistryRepository, DocumentStatus, EqualFilter, PatientFilter, PatientRepository,
    ProgramFilter, ProgramRepository, ProgramRow, RepositoryError, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    programs::patient::patient_doc_name,
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    program_enrolment_updated::update_program_enrolment_row, program_schema::SchemaProgramEnrolment,
};

#[derive(PartialEq, Debug)]
pub enum UpsertProgramEnrolmentError {
    NotAllowedToMutateDocument,
    InvalidPatientId,
    InvalidParentId,
    /// Each patient can only be enrolled in a program once
    ProgramEnrolmentExists,
    ProgramDoesNotExist,
    InvalidDataSchema(Vec<String>),
    DocumentTypeDoesNotExit,
    DataSchemaDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpsertProgramEnrolment {
    pub patient_id: String,
    pub r#type: String,
    pub data: serde_json::Value,
    pub schema_id: String,
    /// If the patient is new the parent is not set
    pub parent: Option<String>,
}

pub fn upsert_program_enrolment(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    user_id: &str,
    input: UpsertProgramEnrolment,
    allowed_ctx: Vec<String>,
) -> Result<Document, UpsertProgramEnrolmentError> {
    let program_document = ctx
        .connection
        .transaction_sync(|_| {
            let patient_id = input.patient_id.clone();
            let (schema_program, registry, program_row) = validate(ctx, service_provider, &input)?;
            let doc = generate(user_id, input, registry)?;

            let document = service_provider
                .document_service
                .update_document(ctx, doc, &allowed_ctx)
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpsertProgramEnrolmentError::NotAllowedToMutateDocument
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpsertProgramEnrolmentError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpsertProgramEnrolmentError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpsertProgramEnrolmentError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpsertProgramEnrolmentError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => {
                        UpsertProgramEnrolmentError::InvalidParentId
                    }
                })?;

            if is_latest_doc(&ctx.connection, &document.name, document.datetime)
                .map_err(UpsertProgramEnrolmentError::DatabaseError)?
            {
                update_program_enrolment_row(
                    &ctx.connection,
                    &patient_id,
                    &document,
                    schema_program,
                    program_row,
                )?;
            };
            Ok(document)
        })
        .map_err(|err: TransactionError<UpsertProgramEnrolmentError>| err.to_inner_error())?;
    Ok(program_document)
}

impl From<RepositoryError> for UpsertProgramEnrolmentError {
    fn from(err: RepositoryError) -> Self {
        UpsertProgramEnrolmentError::DatabaseError(err)
    }
}

fn generate(
    user_id: &str,
    input: UpsertProgramEnrolment,
    registry: DocumentRegistry,
) -> Result<RawDocument, RepositoryError> {
    Ok(RawDocument {
        name: patient_doc_name(&input.patient_id, &input.r#type),
        parents: input.parent.map(|p| vec![p]).unwrap_or(vec![]),
        author: user_id.to_string(),
        datetime: Utc::now(),
        r#type: input.r#type.clone(),
        data: input.data,
        form_schema_id: Some(input.schema_id),
        status: DocumentStatus::Active,
        owner_name_id: Some(input.patient_id),
        context_id: registry.context_id,
    })
}

fn validate_program_schema(
    input: &UpsertProgramEnrolment,
) -> Result<SchemaProgramEnrolment, serde_json::Error> {
    // Check that we can parse the data into a default Program object, i.e. that it's following the
    // default program JSON schema.
    // If the program data uses a derived program schema, the derived schema is validated in the
    // document service.
    serde_json::from_value(input.data.clone())
}

fn validate_patient_exists(
    ctx: &ServiceContext,
    patient_id: &str,
) -> Result<bool, RepositoryError> {
    let patient = PatientRepository::new(&ctx.connection)
        .query_by_filter(
            PatientFilter::new().id(EqualFilter::equal_to(patient_id)),
            None,
        )?
        .pop();
    Ok(patient.is_some())
}

fn validate_program_not_exists(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    document_type: &str,
) -> Result<bool, RepositoryError> {
    let patient_name = patient_doc_name(patient_id, document_type);
    let existing_document = service_provider
        .document_service
        .document(ctx, &patient_name, None)?;
    Ok(existing_document.is_none())
}

fn validate_document_type(
    ctx: &ServiceContext,
    document_type: &str,
) -> Result<Option<DocumentRegistry>, RepositoryError> {
    let mut entry = DocumentRegistryRepository::new(&ctx.connection).query_by_filter(
        DocumentRegistryFilter::new()
            .r#type(DocumentRegistryCategory::ProgramEnrolment.equal_to())
            .document_type(EqualFilter::equal_to(document_type)),
    )?;
    Ok(entry.pop())
}

fn validate_program(
    ctx: &ServiceContext,
    context_id: &str,
) -> Result<Option<ProgramRow>, RepositoryError> {
    ProgramRepository::new(&ctx.connection)
        .query_one(ProgramFilter::new().context_id(EqualFilter::equal_to(context_id)))
}

fn validate(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    input: &UpsertProgramEnrolment,
) -> Result<(SchemaProgramEnrolment, DocumentRegistry, ProgramRow), UpsertProgramEnrolmentError> {
    if !validate_patient_exists(ctx, &input.patient_id)? {
        return Err(UpsertProgramEnrolmentError::InvalidPatientId);
    }

    let document_registry = match validate_document_type(ctx, &input.r#type)? {
        Some(document_registry) => document_registry,
        None => return Err(UpsertProgramEnrolmentError::DocumentTypeDoesNotExit),
    };

    let program_row = match validate_program(ctx, &document_registry.context_id)? {
        Some(program_row) => program_row,
        None => return Err(UpsertProgramEnrolmentError::ProgramDoesNotExist),
    };

    let program_enrolment_json = validate_program_schema(input).map_err(|err| {
        UpsertProgramEnrolmentError::InvalidDataSchema(vec![format!(
            "Invalid program data: {}",
            err
        )])
    })?;

    if input.parent.is_none()
        && !validate_program_not_exists(ctx, service_provider, &input.patient_id, &input.r#type)?
    {
        return Err(UpsertProgramEnrolmentError::ProgramEnrolmentExists);
    }

    Ok((program_enrolment_json, document_registry, program_row))
}

#[cfg(test)]
mod test {
    use chrono::{DateTime, Timelike, Utc};
    use repository::{
        mock::{context_program_a, mock_form_schema_empty, mock_program_a, MockDataInserts},
        test_db::setup_all,
        DocumentFilter, DocumentRegistryCategory, DocumentRegistryRow,
        DocumentRegistryRowRepository, DocumentRepository, FormSchemaRowRepository, Pagination,
        ProgramEnrolmentRepository, StringFilter,
    };
    use serde_json::json;
    use util::{
        constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE},
        inline_init,
    };

    use crate::{
        programs::{
            patient::{patient_doc_name, test::mock_patient_1, UpdateProgramPatient},
            program_enrolment::{program_schema::SchemaProgramEnrolment, UpsertProgramEnrolment},
        },
        service_provider::ServiceProvider,
    };

    use super::UpsertProgramEnrolmentError;

    #[actix_rt::test]
    async fn test_program_upsert() {
        let (_, _, connection_manager, _) = setup_all(
            "test_program_upsert",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .name_store_joins()
                .full_master_list()
                .contexts()
                .programs(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.basic_context().unwrap();

        // dummy schema
        let schema = mock_form_schema_empty();
        FormSchemaRowRepository::new(&ctx.connection)
            .upsert_one(&schema)
            .unwrap();
        let enrolment_doc_type = "ProgramEnrolmentType".to_string();
        let program_context = context_program_a().id;
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
        registry_repo
            .upsert_one(&DocumentRegistryRow {
                id: "program_enrolment_id".to_string(),
                category: DocumentRegistryCategory::ProgramEnrolment,
                document_type: enrolment_doc_type.to_string(),
                context_id: program_context.to_string(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
            })
            .unwrap();

        let service = &service_provider.program_enrolment_service;

        // NotAllowedToMutateDocument
        let err = service
            .upsert_program_enrolment(
                &ctx,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: enrolment_doc_type.clone(),
                },
                vec!["WrongType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertProgramEnrolmentError::NotAllowedToMutateDocument);

        // InvalidPatientId
        let err = service
            .upsert_program_enrolment(
                &ctx,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: enrolment_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertProgramEnrolmentError::InvalidPatientId);

        let patient = mock_patient_1();
        service_provider
            .patient_service
            .upsert_program_patient(
                &ctx,
                &service_provider,
                "store_a",
                &patient.id,
                UpdateProgramPatient {
                    data: serde_json::to_value(&patient).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();
        // InvalidDataSchema
        let err = service
            .upsert_program_enrolment(
                &ctx,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: enrolment_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertProgramEnrolmentError::InvalidDataSchema(_));

        // success insert

        let program = inline_init(|v: &mut SchemaProgramEnrolment| {
            v.enrolment_datetime = Utc::now().with_nanosecond(0).unwrap().to_rfc3339();
            v.program_enrolment_id = Some("patient id 1".to_string());
        });

        service
            .upsert_program_enrolment(
                &ctx,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    data: serde_json::to_value(program.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: patient.id.clone(),
                    r#type: enrolment_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .unwrap();

        assert_eq!(
            service
                .upsert_program_enrolment(
                    &ctx,
                    &service_provider,
                    "user",
                    UpsertProgramEnrolment {
                        patient_id: patient.id.clone(),
                        r#type: enrolment_doc_type.clone(),
                        data: serde_json::to_value(program.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: None
                    },
                    vec![program_context.clone()]
                )
                .err()
                .unwrap(),
            UpsertProgramEnrolmentError::ProgramEnrolmentExists,
        );

        assert_eq!(
            service
                .upsert_program_enrolment(
                    &ctx,
                    &service_provider,
                    "user",
                    UpsertProgramEnrolment {
                        patient_id: patient.id.clone(),
                        r#type: enrolment_doc_type.clone(),
                        data: serde_json::to_value(program.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: Some("invalid".to_string()),
                    },
                    vec![program_context.clone()]
                )
                .err()
                .unwrap(),
            UpsertProgramEnrolmentError::InvalidParentId
        );

        // success update
        let v0 = DocumentRepository::new(&ctx.connection)
            .query(
                Pagination::one(),
                Some(
                    DocumentFilter::new().name(StringFilter::equal_to(&patient_doc_name(
                        &patient.id,
                        &enrolment_doc_type,
                    ))),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        service
            .upsert_program_enrolment(
                &ctx,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    patient_id: patient.id.clone(),
                    r#type: enrolment_doc_type.clone(),
                    data: serde_json::to_value(program.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: Some(v0.id),
                },
                vec![program_context.clone()],
            )
            .unwrap();
        // Test program has been written to the programs table
        let found_program = ProgramEnrolmentRepository::new(&ctx.connection)
            .find_one_by_program_id_and_patient(&mock_program_a().id, &patient.id)
            .unwrap()
            .unwrap();
        assert_eq!(program_context, found_program.program_row.context_id);
        assert_eq!(
            program.enrolment_datetime,
            DateTime::<Utc>::from_naive_utc_and_offset(found_program.row.enrolment_datetime, Utc)
                .to_rfc3339()
        );
        assert_eq!(
            program.program_enrolment_id,
            found_program.row.program_enrolment_id
        );
    }
}
