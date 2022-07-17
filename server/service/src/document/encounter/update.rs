use chrono::Utc;
use repository::{Document, DocumentRepository, RepositoryError, TransactionError};

use crate::{
    document::{document_service::DocumentInsertError, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::encounter_schema::SchemaEncounter;

#[derive(PartialEq, Debug)]
pub enum UpdateEncounterError {
    InvalidParentId,
    InvalidDataSchema(Vec<String>),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct UpdateEncounter {
    pub parent: String,
    pub data: serde_json::Value,
    pub schema_id: String,
}

pub fn update_encounter(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: String,
    user_id: &str,
    input: UpdateEncounter,
) -> Result<Document, UpdateEncounterError> {
    let patient = ctx
        .connection
        .transaction_sync(|_| {
            let existing = validate(ctx, &input)?;
            let doc = generate(user_id, input, existing)?;

            // Updating the document will trigger an update in the patient (names) table
            let result = service_provider
                .document_service
                .update_document(ctx, &store_id, doc)
                .map_err(|err| match err {
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdateEncounterError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdateEncounterError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdateEncounterError::InternalError(err)
                    }
                    _ => UpdateEncounterError::InternalError(format!("{:?}", err)),
                })?;

            Ok(result)
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
        timestamp: Utc::now(),
        r#type: existing.r#type,
        data: input.data,
        schema_id: Some(input.schema_id),
    })
}

fn validate_encounter_schema(
    input: &UpdateEncounter,
) -> Result<SchemaEncounter, serde_json::Error> {
    serde_json::from_value(input.data.clone())
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
) -> Result<Document, UpdateEncounterError> {
    validate_encounter_schema(input).map_err(|err| {
        UpdateEncounterError::InvalidDataSchema(vec![format!("Invalid program data: {}", err)])
    })?;

    let doc = match validate_parent(ctx, &input.parent)? {
        Some(doc) => doc,
        None => return Err(UpdateEncounterError::InvalidParentId),
    };

    Ok(doc)
}

#[cfg(test)]
mod test {
    use chrono::Utc;
    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        test_db::setup_all,
        FormSchemaRowRepository,
    };
    use serde_json::json;

    use crate::{
        document::{
            encounter::{encounter_schema::SchemaEncounter, InsertEncounter, UpdateEncounter},
            patient::{test::mock_patient_1, UpdatePatient},
            program::{program_schema::SchemaProgram, UpsertProgram},
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateEncounterError;

    #[actix_rt::test]
    async fn test_encounter_update() {
        let (_, _, connection_manager, _) = setup_all(
            "test_encounter_update",
            MockDataInserts::none().names().stores().form_schemas(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let ctx = service_provider.context().unwrap();

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
                "store_a".to_string(),
                &patient.id,
                UpdatePatient {
                    data: serde_json::to_value(&patient).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                },
            )
            .unwrap();
        let program = SchemaProgram {
            enrolment_datetime: Utc::now().to_rfc3339(),
        };
        let program_type = "ProgramType".to_string();
        service_provider
            .program_service
            .upsert_program(
                &ctx,
                &service_provider,
                "store_a".to_string(),
                "user",
                UpsertProgram {
                    data: serde_json::to_value(program.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: None,
                    patient_id: patient.id.clone(),
                    r#type: program_type.clone(),
                },
            )
            .unwrap();
        let service = &service_provider.encounter_service;
        let encounter = SchemaEncounter {
            encounter_datetime: Utc::now().to_rfc3339(),
            status: None,
        };
        let program_type = "ProgramType".to_string();
        let initial_encounter = service
            .insert_encounter(
                &ctx,
                &service_provider,
                "store_a".to_string(),
                "user",
                InsertEncounter {
                    data: serde_json::to_value(encounter.clone()).unwrap(),
                    schema_id: schema.id.clone(),
                    patient_id: patient.id.clone(),
                    r#type: program_type.clone(),
                    program_type: program_type.clone(),
                },
            )
            .unwrap();

        // InvalidParentId
        let err = service
            .update_encounter(
                &ctx,
                &service_provider,
                "store_a".to_string(),
                "user",
                UpdateEncounter {
                    data: json!({"enrolment_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: "invalid".to_string(),
                },
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::InvalidParentId);

        // InvalidDataSchema
        let err = service
            .update_encounter(
                &ctx,
                &service_provider,
                "store_a".to_string(),
                "user",
                UpdateEncounter {
                    data: json!({"encounter_datetime": true}),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
            )
            .err()
            .unwrap();
        matches!(err, UpdateEncounterError::InvalidDataSchema(_));

        // success update
        let encounter = SchemaEncounter {
            encounter_datetime: Utc::now().to_rfc3339(),
            status: None,
        };
        service
            .update_encounter(
                &ctx,
                &service_provider,
                "store_a".to_string(),
                "user",
                UpdateEncounter {
                    data: serde_json::to_value(encounter).unwrap(),
                    schema_id: schema.id.clone(),
                    parent: initial_encounter.id.clone(),
                },
            )
            .unwrap();
    }
}
