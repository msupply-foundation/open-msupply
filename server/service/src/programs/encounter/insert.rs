use chrono::{DateTime, Utc};
use repository::{
    ClinicianRow, Document, DocumentRegistry, DocumentRegistryFilter, DocumentRegistryRepository,
    DocumentStatus, EqualFilter, ProgramEnrolment, ProgramEnrolmentFilter,
    ProgramEnrolmentRepository, ProgramRow, RepositoryError, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    programs::{
        patient::patient_doc_name_with_id, update_program_document::UpdateProgramDocumentError,
    },
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    encounter_schema::EncounterStatus,
    encounter_updated::update_encounter_row_and_events,
    validate_misc::{
        validate_clinician_exists, validate_encounter_schema, ValidatedSchemaEncounter,
    },
};

#[derive(PartialEq, Debug)]
pub enum InsertEncounterError {
    NotAllowedToMutateDocument,
    InvalidEncounterType,
    PatientIsNotEnrolled,
    InvalidDataSchema(Vec<String>),
    DataSchemaDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
    InvalidClinicianId,
}

pub struct InsertEncounter {
    pub patient_id: String,
    pub r#type: String,
    pub data: serde_json::Value,
    pub schema_id: String,
    pub event_datetime: DateTime<Utc>,
}

pub fn insert_encounter(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    user_id: &str,
    input: InsertEncounter,
    allowed_ctx: Vec<String>,
) -> Result<Document, InsertEncounterError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let (encounter, program_enrolment, clinician) = validate(ctx, &input)?;
            let patient_id = input.patient_id.clone();
            let event_datetime = input.event_datetime;
            let doc = generate(
                user_id,
                input,
                event_datetime,
                &program_enrolment.program_row,
                &encounter,
            )?;
            let encounter_start_datetime = encounter.start_datetime;

            let document = service_provider
                .document_service
                .update_document(ctx, doc, &allowed_ctx)
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        InsertEncounterError::NotAllowedToMutateDocument
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        InsertEncounterError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        InsertEncounterError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        InsertEncounterError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        InsertEncounterError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(err) => {
                        InsertEncounterError::InternalError(err)
                    }
                })?;

            if is_latest_doc(&ctx.connection, &document.name, document.datetime)
                .map_err(InsertEncounterError::DatabaseError)?
            {
                update_encounter_row_and_events(
                    &ctx.connection,
                    &patient_id,
                    &document,
                    encounter,
                    clinician.map(|c| c.id),
                    program_enrolment.program_row,
                    encounter_start_datetime,
                    None,
                    Some(&allowed_ctx),
                )
                .map_err(|err| match err {
                    UpdateProgramDocumentError::DatabaseError(err) => {
                        InsertEncounterError::DatabaseError(err)
                    }
                    UpdateProgramDocumentError::InternalError(err) => {
                        InsertEncounterError::InternalError(err)
                    }
                })?;
            }

            Ok(document)
        })
        .map_err(|err: TransactionError<InsertEncounterError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for InsertEncounterError {
    fn from(err: RepositoryError) -> Self {
        InsertEncounterError::DatabaseError(err)
    }
}

fn generate(
    user_id: &str,
    input: InsertEncounter,
    event_datetime: DateTime<Utc>,
    program_row: &ProgramRow,
    encounter: &ValidatedSchemaEncounter,
) -> Result<RawDocument, RepositoryError> {
    let encounter_name = Utc::now().to_rfc3339();
    let status = encounter
        .encounter
        .status
        .as_ref()
        .and_then(|status| {
            if status == &EncounterStatus::Deleted {
                return Some(DocumentStatus::Deleted);
            }
            None
        })
        .unwrap_or(DocumentStatus::Active);
    Ok(RawDocument {
        name: patient_doc_name_with_id(&input.patient_id, &input.r#type, &encounter_name),
        parents: vec![],
        author: user_id.to_string(),
        datetime: event_datetime,
        r#type: input.r#type.clone(),
        data: input.data,
        form_schema_id: Some(input.schema_id),
        status,
        owner_name_id: Some(input.patient_id),
        context_id: program_row.context_id.clone(),
    })
}

fn validate_encounter_registry(
    ctx: &ServiceContext,
    encounter_document_type: &str,
) -> Result<Option<DocumentRegistry>, RepositoryError> {
    let encounter_registry = DocumentRegistryRepository::new(&ctx.connection)
        .query_by_filter(
            DocumentRegistryFilter::new()
                .document_type(EqualFilter::equal_to(encounter_document_type)),
        )?
        .pop();
    Ok(encounter_registry)
}

fn validate_patient_program_exists(
    ctx: &ServiceContext,
    patient_id: &str,
    encounter_registry: DocumentRegistry,
) -> Result<Option<ProgramEnrolment>, RepositoryError> {
    Ok(ProgramEnrolmentRepository::new(&ctx.connection)
        .query_by_filter(
            ProgramEnrolmentFilter::new()
                .patient_id(EqualFilter::equal_to(patient_id))
                .context_id(EqualFilter::equal_to(&encounter_registry.context_id)),
        )?
        .pop())
}

fn validate(
    ctx: &ServiceContext,
    input: &InsertEncounter,
) -> Result<
    (
        ValidatedSchemaEncounter,
        ProgramEnrolment,
        Option<ClinicianRow>,
    ),
    InsertEncounterError,
> {
    let Some(encounter_registry) = validate_encounter_registry(ctx, &input.r#type)? else {
        return Err(InsertEncounterError::InvalidEncounterType);
    };
    let Some(program_enrolment) =
        validate_patient_program_exists(ctx, &input.patient_id, encounter_registry)?
    else {
        return Err(InsertEncounterError::PatientIsNotEnrolled);
    };

    let encounter = validate_encounter_schema(&input.data).map_err(|err| {
        InsertEncounterError::InvalidDataSchema(vec![format!("Invalid program data: {}", err)])
    })?;

    let clinician_row = if let Some(clinician_id) = encounter
        .encounter
        .clinician
        .as_ref()
        .map(|c| c.id.clone())
        .flatten()
    {
        let clinician_row = validate_clinician_exists(&ctx.connection, &clinician_id)?;
        if clinician_row.is_none() {
            return Err(InsertEncounterError::InvalidClinicianId);
        }
        clinician_row
    } else {
        None
    };

    Ok((encounter, program_enrolment, clinician_row))
}

#[cfg(test)]
mod test {
    use chrono::Utc;
    use repository::{
        mock::{context_program_a, mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository,
        EncounterFilter, EncounterRepository, EqualFilter, FormSchemaRowRepository,
    };
    use serde_json::json;
    use util::{
        constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE},
        inline_init,
    };

    use crate::{
        programs::{
            encounter::{
                encounter_schema::{EncounterStatus, SchemaEncounter},
                InsertEncounter,
            },
            patient::{test::mock_patient_1, UpdateProgramPatient},
            program_enrolment::{program_schema::SchemaProgramEnrolment, UpsertProgramEnrolment},
        },
        service_provider::ServiceProvider,
    };

    use super::InsertEncounterError;

    #[actix_rt::test]
    async fn test_encounter_insert() {
        let (_, _, connection_manager, _) = setup_all(
            "test_encounter_insert",
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
        let encounter_type = "EncounterType".to_string();
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
                id: "program_enrolment_rego_id".to_string(),
                category: DocumentRegistryCategory::ProgramEnrolment,
                document_type: enrolment_doc_type.to_string(),
                context_id: program_context.clone(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
            })
            .unwrap();
        registry_repo
            .upsert_one(&DocumentRegistryRow {
                id: "encounter_rego_id".to_string(),
                category: DocumentRegistryCategory::Encounter,
                document_type: encounter_type.to_string(),
                context_id: program_context.clone(),
                name: None,
                form_schema_id: Some(schema.id.clone()),
                config: None,
            })
            .unwrap();

        // insert patient and program
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
        let program = inline_init(|v: &mut SchemaProgramEnrolment| {
            v.enrolment_datetime = Utc::now().to_rfc3339();
        });

        service_provider
            .program_enrolment_service
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

        // start actual test:
        let service = &service_provider.encounter_service;

        // NotAllowedToMutateDocument
        let err = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: json!({"encounter_datetime": true}),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: encounter_type.to_string(),
                    event_datetime: Utc::now(),
                },
                vec!["WrongType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, InsertEncounterError::NotAllowedToMutateDocument);

        // InvalidEncounterType
        let err = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: json!({"enrolment_datetime":true}),
                    schema_id: schema.id.clone(),
                    patient_id: "some_id".to_string(),
                    r#type: "SomeType".to_string(),
                    event_datetime: Utc::now(),
                },
                vec!["SomeType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, InsertEncounterError::InvalidEncounterType);

        // PatientIsNotEnrolled,
        let err = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: json!({"enrolment_datetime":true}),
                    schema_id: schema.id.clone(),
                    patient_id: "some_id".to_string(),
                    r#type: encounter_type.to_string(),
                    event_datetime: Utc::now(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, InsertEncounterError::PatientIsNotEnrolled);
        let err = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: json!({"enrolment_datetime":true}),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: encounter_type.to_string(),
                    event_datetime: Utc::now(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, InsertEncounterError::PatientIsNotEnrolled);

        // InvalidDataSchema
        let err = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: json!({"encounter_datetime": true}),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: encounter_type.to_string(),
                    event_datetime: Utc::now(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, InsertEncounterError::InvalidDataSchema(_));

        // success insert
        let encounter = inline_init(|e: &mut SchemaEncounter| {
            e.created_datetime = Utc::now().to_rfc3339();
            e.start_datetime = Utc::now().to_rfc3339();
            e.status = Some(EncounterStatus::Pending);
        });
        let result = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: serde_json::to_value(encounter.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: encounter_type.to_string(),
                    event_datetime: Utc::now(),
                },
                vec![program_context.clone()],
            )
            .unwrap();
        let found = service_provider
            .document_service
            .document(&ctx, &result.name, None)
            .unwrap()
            .unwrap();
        assert!(found.parent_ids.is_empty());
        assert_eq!(found.data, serde_json::to_value(encounter.clone()).unwrap());
        // check that encounter table has been updated
        let row = EncounterRepository::new(&ctx.connection)
            .query_by_filter(
                EncounterFilter::new().document_name(EqualFilter::equal_to(&found.name)),
            )
            .unwrap()
            .pop();
        assert!(row.is_some());
    }
}
