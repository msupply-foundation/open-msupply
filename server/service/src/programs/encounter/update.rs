use chrono::Utc;
use repository::{
    ClinicianRow, Document, DocumentRepository, Encounter, EncounterFilter, EncounterRepository,
    EqualFilter, RepositoryError, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    programs::update_program_document::UpdateProgramDocumentError,
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    encounter_updated,
    validate_misc::{
        validate_clinician_exists, validate_encounter_schema, ValidatedSchemaEncounter,
    },
};

#[derive(PartialEq, Debug)]
pub enum UpdateEncounterError {
    NotAllowedToMutateDocument,
    InvalidParentId,
    EncounterRowNotFound,
    InvalidDataSchema(Vec<String>),
    DataSchemaDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
    InvalidClinicianId,
}

pub struct UpdateEncounter {
    pub r#type: String,
    pub parent: String,
    pub data: serde_json::Value,
    pub schema_id: String,
}

pub fn update_encounter(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    user_id: &str,
    input: UpdateEncounter,
    allowed_ctx: Vec<String>,
) -> Result<Document, UpdateEncounterError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let (existing, encounter, existing_encounter_row, clinician_row) =
                validate(ctx, &input)?;
            let encounter_start_datetime = encounter.start_datetime;
            let doc = generate(user_id, input, existing)?;

            let document = service_provider
                .document_service
                .update_document(ctx, doc, &allowed_ctx)
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpdateEncounterError::NotAllowedToMutateDocument
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdateEncounterError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdateEncounterError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdateEncounterError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpdateEncounterError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => UpdateEncounterError::InvalidParentId,
                })?;

            if is_latest_doc(&ctx.connection, &document.name, document.datetime)
                .map_err(UpdateEncounterError::DatabaseError)?
            {
                encounter_updated::update_encounter_row_and_events(
                    &ctx.connection,
                    &existing_encounter_row.patient_row.id,
                    &document,
                    encounter,
                    clinician_row.map(|c| c.id),
                    existing_encounter_row.program_row,
                    encounter_start_datetime,
                    Some(existing_encounter_row.row.start_datetime),
                    Some(&allowed_ctx),
                )
                .map_err(|err| match err {
                    UpdateProgramDocumentError::DatabaseError(err) => {
                        UpdateEncounterError::DatabaseError(err)
                    }
                    UpdateProgramDocumentError::InternalError(err) => {
                        UpdateEncounterError::InternalError(err)
                    }
                })?;
            }
            Ok(document)
        })
        .map_err(|err: TransactionError<UpdateEncounterError>| err.to_inner_error())?;
    Ok(patient)
}

impl From<RepositoryError> for UpdateEncounterError {
    fn from(err: RepositoryError) -> Self {
        UpdateEncounterError::DatabaseError(err)
    }
}

fn generate(
    user_id: &str,
    input: UpdateEncounter,
    existing: Document,
) -> Result<RawDocument, RepositoryError> {
    Ok(RawDocument {
        name: existing.name,
        parents: vec![input.parent],
        author: user_id.to_string(),
        datetime: Utc::now(),
        r#type: existing.r#type,
        data: input.data,
        form_schema_id: Some(input.schema_id),
        status: existing.status,
        owner_name_id: existing.owner_name_id,
        context_id: existing.context_id,
    })
}

fn validate_exiting_encounter(
    ctx: &ServiceContext,
    name: &str,
) -> Result<Option<Encounter>, RepositoryError> {
    let result = EncounterRepository::new(&ctx.connection)
        .query_by_filter(EncounterFilter::new().document_name(EqualFilter::equal_to(name)))?
        .pop();
    Ok(result)
}

fn validate_parent(
    ctx: &ServiceContext,
    parent: &str,
) -> Result<Option<Document>, RepositoryError> {
    let parent_doc = DocumentRepository::new(&ctx.connection).find_one_by_id(parent)?;
    Ok(parent_doc)
}

fn validate(
    ctx: &ServiceContext,
    input: &UpdateEncounter,
) -> Result<
    (
        Document,
        ValidatedSchemaEncounter,
        Encounter,
        Option<ClinicianRow>,
    ),
    UpdateEncounterError,
> {
    let encounter = validate_encounter_schema(&input.data)
        .map_err(|err| UpdateEncounterError::InvalidDataSchema(vec![err]))?;

    let clinician_row = if let Some(clinician_id) = encounter
        .encounter
        .clinician
        .as_ref()
        .and_then(|c| c.id.clone())
    {
        let clinician_row = validate_clinician_exists(&ctx.connection, &clinician_id)?;
        if clinician_row.is_none() {
            return Err(UpdateEncounterError::InvalidClinicianId);
        }
        clinician_row
    } else {
        None
    };

    let doc = match validate_parent(ctx, &input.parent)? {
        Some(doc) => doc,
        None => return Err(UpdateEncounterError::InvalidParentId),
    };

    let encounter_row = match validate_exiting_encounter(ctx, &doc.name)? {
        Some(row) => row,
        None => return Err(UpdateEncounterError::EncounterRowNotFound),
    };

    Ok((doc, encounter, encounter_row, clinician_row))
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
                InsertEncounter, UpdateEncounter,
            },
            patient::{test::mock_patient_1, UpdateProgramPatient},
            program_enrolment::{program_schema::SchemaProgramEnrolment, UpsertProgramEnrolment},
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateEncounterError;

    #[actix_rt::test]
    async fn test_encounter_update() {
        let (_, _, connection_manager, _) = setup_all(
            "test_encounter_update",
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

        // insert patient, program and initial encounter
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
        let service = &service_provider.encounter_service;
        let encounter = inline_init(|e: &mut SchemaEncounter| {
            e.created_datetime = Utc::now().to_rfc3339();
            e.start_datetime = Utc::now().to_rfc3339();
            e.status = Some(EncounterStatus::Pending);
        });
        let initial_encounter = service
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

        // NotAllowedToMutateDocument
        let err = service
            .update_encounter(
                &ctx,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: "TestEncounterType".to_string(),
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: "invalid".to_string(),
                },
                vec!["WrongType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::NotAllowedToMutateDocument);

        // InvalidParentId
        let err = service
            .update_encounter(
                &ctx,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: encounter_type.to_string(),
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: "invalid".to_string(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::InvalidParentId);

        // InvalidDataSchema
        let err = service
            .update_encounter(
                &ctx,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: encounter_type.to_string(),
                    data: json!({"encounter_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
                vec![program_context.clone()],
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::InvalidDataSchema(_));

        // success update
        let encounter = inline_init(|e: &mut SchemaEncounter| {
            e.created_datetime = Utc::now().to_rfc3339();
            e.start_datetime = Utc::now().to_rfc3339();
            e.status = Some(EncounterStatus::Visited);
        });
        let result = service
            .update_encounter(
                &ctx,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: encounter_type.to_string(),
                    data: serde_json::to_value(encounter.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
                vec![program_context.clone()],
            )
            .unwrap();
        let found = service_provider
            .document_service
            .document(&ctx, &result.name, None)
            .unwrap()
            .unwrap();
        assert_eq!(found.parent_ids, vec![initial_encounter.id]);
        assert_eq!(found.data, serde_json::to_value(encounter.clone()).unwrap());
        // check that encounter table has been updated
        let encounter = EncounterRepository::new(&ctx.connection)
            .query_by_filter(
                EncounterFilter::new().document_name(EqualFilter::equal_to(&found.name)),
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(
            encounter.row.status,
            Some(repository::EncounterStatus::Visited)
        );
    }
}
