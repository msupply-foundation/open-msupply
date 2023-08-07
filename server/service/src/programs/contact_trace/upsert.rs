use chrono::Utc;
use repository::{
    Document, DocumentFilter, DocumentRegistry, DocumentRegistryCategory, DocumentRegistryFilter,
    DocumentRegistryRepository, DocumentRepository, DocumentStatus, EqualFilter, Pagination,
    ProgramFilter, ProgramRepository, ProgramRow, RepositoryError, StringFilter, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    programs::patient::{main_patient_doc_name, patient_doc_name_with_id},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    contact_trace_schema::SchemaContactTrace, contact_trace_updated::update_contact_trace_row,
};

#[derive(PartialEq, Debug)]
pub enum UpsertContactTraceError {
    NotAllowedToMutateDocument,
    InvalidRootPatientId,
    InvalidPatientId,
    /// Invalid document parent id
    InvalidParentId,
    InvalidDataSchema(Vec<String>),
    DocumentTypeDoesNotExit,
    DataSchemaDoesNotExist,

    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpsertContactTrace {
    pub patient_id: String,
    /// Document type for this contact trace
    pub r#type: String,
    pub data: serde_json::Value,
    pub schema_id: String,
    /// If the patient is new the parent is not set
    pub parent: Option<String>,
}

pub fn upsert_contact_trace(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    user_id: &str,
    input: UpsertContactTrace,
    allowed_ctx: Vec<String>,
) -> Result<Document, UpsertContactTraceError> {
    let document = ctx
        .connection
        .transaction_sync(|_| {
            let patient_id = input.patient_id.clone();
            let (schema_program, registry, program_row) = validate(ctx, &input)?;
            let doc = generate(user_id, input, registry)?;

            let document = service_provider
                .document_service
                .update_document(ctx, doc, &allowed_ctx)
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpsertContactTraceError::NotAllowedToMutateDocument
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpsertContactTraceError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpsertContactTraceError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpsertContactTraceError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpsertContactTraceError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => {
                        UpsertContactTraceError::InvalidParentId
                    }
                })?;

            if is_latest_doc(&ctx.connection, &document.name, document.datetime)
                .map_err(UpsertContactTraceError::DatabaseError)?
            {
                update_contact_trace_row(
                    &ctx.connection,
                    &patient_id,
                    &document,
                    schema_program,
                    program_row,
                )?;
            };
            Ok(document)
        })
        .map_err(|err: TransactionError<UpsertContactTraceError>| err.to_inner_error())?;
    Ok(document)
}

impl From<RepositoryError> for UpsertContactTraceError {
    fn from(err: RepositoryError) -> Self {
        UpsertContactTraceError::DatabaseError(err)
    }
}

fn generate(
    user_id: &str,
    input: UpsertContactTrace,
    registry: DocumentRegistry,
) -> Result<RawDocument, RepositoryError> {
    let now = Utc::now();
    Ok(RawDocument {
        name: patient_doc_name_with_id(&input.patient_id, &input.r#type, &now.to_rfc3339()),
        parents: input.parent.map(|p| vec![p]).unwrap_or(vec![]),
        author: user_id.to_string(),
        datetime: now,
        r#type: input.r#type.clone(),
        data: input.data,
        form_schema_id: Some(input.schema_id),
        status: DocumentStatus::Active,
        owner_name_id: Some(input.patient_id),
        context_id: registry.context_id,
    })
}

fn validate_contact_trace_schema(
    input: &UpsertContactTrace,
) -> Result<SchemaContactTrace, serde_json::Error> {
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
    let doc_name = main_patient_doc_name(patient_id);
    let document = DocumentRepository::new(&ctx.connection)
        .query(
            Pagination::one(),
            Some(DocumentFilter::new().name(StringFilter::equal_to(&doc_name))),
            None,
        )?
        .pop();
    Ok(document.is_some())
}

fn validate_document_type(
    ctx: &ServiceContext,
    document_type: &str,
) -> Result<Option<DocumentRegistry>, RepositoryError> {
    let mut entry = DocumentRegistryRepository::new(&ctx.connection).query_by_filter(
        DocumentRegistryFilter::new()
            .r#type(DocumentRegistryCategory::ContactTrace.equal_to())
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
    input: &UpsertContactTrace,
) -> Result<(SchemaContactTrace, DocumentRegistry, ProgramRow), UpsertContactTraceError> {
    if !validate_patient_exists(ctx, &input.patient_id)? {
        return Err(UpsertContactTraceError::InvalidRootPatientId);
    }

    let document_registry = match validate_document_type(ctx, &input.r#type)? {
        Some(document_registry) => document_registry,
        None => return Err(UpsertContactTraceError::DocumentTypeDoesNotExit),
    };

    let program_row = match validate_program(ctx, &document_registry.context_id)? {
        Some(program_row) => program_row,
        None => {
            return Err(UpsertContactTraceError::InternalError(
                "Missing program".to_string(),
            ))
        }
    };

    let contact_trace_json: super::contact_trace_schema::ContactTrace =
        validate_contact_trace_schema(input).map_err(|err| {
            UpsertContactTraceError::InvalidDataSchema(vec![format!(
                "Invalid program data: {}",
                err
            )])
        })?;
    if let Some(patient_id) = &contact_trace_json.id {
        if !validate_patient_exists(ctx, patient_id)? {
            return Err(UpsertContactTraceError::InvalidPatientId);
        }
    }

    Ok((contact_trace_json, document_registry, program_row))
}

#[cfg(test)]
mod test {
    use chrono::{DateTime, Timelike, Utc};
    use repository::{
        contact_trace::{ContactTraceFilter, ContactTraceRepository},
        mock::{context_program_a, mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository,
        FormSchemaRowRepository, StringFilter,
    };
    use serde_json::json;
    use util::{
        constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE},
        inline_init,
    };

    use crate::{
        programs::{
            contact_trace::{contact_trace_schema::SchemaContactTrace, upsert::UpsertContactTrace},
            patient::{test::mock_patient_1, UpdatePatient},
        },
        service_provider::ServiceProvider,
    };

    use super::UpsertContactTraceError;

    #[actix_rt::test]
    async fn test_contact_trace_upsert() {
        let (_, _, connection_manager, _) = setup_all(
            "test_contact_trace_upsert",
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
        let trace_doc_type = "ContactTraceType".to_string();
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
                id: "contact_trace_id".to_string(),
                category: DocumentRegistryCategory::ContactTrace,
                document_type: trace_doc_type.to_string(),
                context_id: program_context.to_string(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
            })
            .unwrap();

        let service = &service_provider.contact_trace_service;

        // NotAllowedToMutateDocument
        let err = service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    data: json!({"datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: trace_doc_type.clone(),
                },
                vec!["WrongType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertContactTraceError::NotAllowedToMutateDocument);

        // InvalidRootPatientId
        let err = service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    data: json!({"datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: trace_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertContactTraceError::InvalidPatientId);

        let patient = mock_patient_1();
        service_provider
            .patient_service
            .upsert_patient(
                &ctx,
                &service_provider,
                "store_a",
                &patient.id,
                UpdatePatient {
                    data: serde_json::to_value(&patient).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();
        // InvalidDataSchema
        let err = service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    data: json!({"datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: "some_id".to_string(),
                    r#type: trace_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertContactTraceError::InvalidDataSchema(_));

        // InvalidPatientId
        let contact_trace = inline_init(|v: &mut SchemaContactTrace| {
            v.id = Some("Invalid patient id".to_string());
        });
        let err = service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    data: serde_json::to_value(contact_trace).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: patient.id.clone(),
                    r#type: trace_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpsertContactTraceError::InvalidPatientId);

        // success insert

        let program = inline_init(|v: &mut SchemaContactTrace| {
            v.datetime = Utc::now().with_nanosecond(0).unwrap().to_rfc3339();
            v.contact_trace_id = Some("patient id 1".to_string());
        });
        let v0 = service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    data: serde_json::to_value(program.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: patient.id.clone(),
                    r#type: trace_doc_type.clone(),
                },
                vec![program_context.clone()],
            )
            .unwrap();

        assert_eq!(
            service
                .upsert_contact_trace(
                    &ctx,
                    &service_provider,
                    "user",
                    UpsertContactTrace {
                        patient_id: patient.id.clone(),
                        r#type: trace_doc_type.clone(),
                        data: serde_json::to_value(program.clone()).unwrap(),
                        schema_id: schema.id.clone(),
                        parent: Some("invalid".to_string()),
                    },
                    vec![program_context.clone()]
                )
                .err()
                .unwrap(),
            UpsertContactTraceError::InvalidParentId
        );

        service
            .upsert_contact_trace(
                &ctx,
                &service_provider,
                "user",
                UpsertContactTrace {
                    patient_id: patient.id.clone(),
                    r#type: trace_doc_type.clone(),
                    data: serde_json::to_value(program.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: Some(v0.id),
                },
                vec![program_context.clone()],
            )
            .unwrap();
        // Test contact trace has been written
        let found_trace = ContactTraceRepository::new(&ctx.connection)
            .query_by_filter(ContactTraceFilter {
                document_name: Some(StringFilter::equal_to(&v0.name)),
                ..ContactTraceFilter::default()
            })
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(program_context, found_trace.1.context_id);
        assert_eq!(
            program.datetime,
            DateTime::<Utc>::from_utc(found_trace.0.datetime, Utc).to_rfc3339()
        );
        assert_eq!(program.contact_trace_id, found_trace.0.contact_trace_id);
    }
}
