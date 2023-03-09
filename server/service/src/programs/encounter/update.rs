use chrono::Utc;
use repository::{
    ClinicianRow, Document, DocumentRepository, Encounter, EncounterFilter, EncounterRepository,
    EqualFilter, RepositoryError, TransactionError,
};

use crate::{
    document::{document_service::DocumentInsertError, is_latest_doc, raw_document::RawDocument},
    programs::update_program_document::{update_program_events, UpdateProgramDocumentError},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    encounter_updated::update_encounter_row,
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
    allowed_docs: Vec<String>,
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
                .update_document(ctx, doc, &allowed_docs)
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

            if is_latest_doc(ctx, service_provider, &document)
                .map_err(UpdateEncounterError::DatabaseError)?
            {
                update_encounter_row(
                    &ctx.connection,
                    &existing_encounter_row.patient_id,
                    &existing_encounter_row.program,
                    &document,
                    encounter,
                    clinician_row.map(|c| c.id),
                )?;

                update_program_events(
                    ctx,
                    service_provider,
                    &existing_encounter_row.patient_id,
                    encounter_start_datetime,
                    Some(existing_encounter_row.start_datetime),
                    &document,
                    &allowed_docs,
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
        comment: None,
        owner_name_id: existing.owner_name_id,
        context: existing.context,
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
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        EncounterFilter, EncounterRepository, EqualFilter, FormSchemaRowRepository,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::{
        programs::{
            encounter::{
                encounter_schema::{EncounterStatus, SchemaEncounter},
                InsertEncounter, UpdateEncounter,
            },
            patient::{test::mock_patient_1, UpdatePatient},
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

        // insert patient, program and initial encounter
        let patient = mock_patient_1();
        service_provider
            .patient_service
            .update_patient(
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
        let program = inline_init(|v: &mut SchemaProgramEnrolment| {
            v.enrolment_datetime = Utc::now().to_rfc3339();
        });
        let program_type = "ProgramType".to_string();
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
                    r#type: program_type.clone(),
                },
                vec![program_type.clone()],
            )
            .unwrap();
        let service = &service_provider.encounter_service;
        let encounter = inline_init(|e: &mut SchemaEncounter| {
            e.created_datetime = Utc::now().to_rfc3339();
            e.start_datetime = Utc::now().to_rfc3339();
            e.status = Some(EncounterStatus::Scheduled);
        });
        let program_type = "ProgramType".to_string();
        let initial_encounter = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "user",
                InsertEncounter {
                    data: serde_json::to_value(encounter.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: "TestEncounterType".to_string(),
                    program: program_type.clone(),
                    event_datetime: Utc::now(),
                },
                vec!["TestEncounterType".to_string()],
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
                    r#type: "TestEncounterType".to_string(),
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: "invalid".to_string(),
                },
                vec!["TestEncounterType".to_string()],
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
                    r#type: "TestEncounterType".to_string(),
                    data: json!({"encounter_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
                vec!["TestEncounterType".to_string()],
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::InvalidDataSchema(_));

        // success update
        let encounter = inline_init(|e: &mut SchemaEncounter| {
            e.created_datetime = Utc::now().to_rfc3339();
            e.start_datetime = Utc::now().to_rfc3339();
            e.status = Some(EncounterStatus::Completed);
        });
        let result = service
            .update_encounter(
                &ctx,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: "TestEncounterType".to_string(),
                    data: serde_json::to_value(encounter.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
                vec!["TestEncounterType".to_string()],
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
        let row = EncounterRepository::new(&ctx.connection)
            .query_by_filter(
                EncounterFilter::new().document_name(EqualFilter::equal_to(&found.name)),
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(row.status, Some(repository::EncounterStatus::Completed));
    }
}
