use repository::{
    Document, DocumentRegistryCategory, DocumentRegistryFilter, DocumentRegistryRepository,
    DocumentRepository, EncounterFilter, EncounterRepository, EqualFilter, ProgramFilter,
    ProgramRepository, RepositoryError, StorageConnection,
};

use crate::{
    document::is_latest_doc,
    programs::{
        encounter::{
            encounter_updated::update_encounter_row, validate_misc::validate_encounter_schema,
        },
        patient::{patient_schema::SchemaPatient, patient_updated::update_patient_row},
        program_enrolment::program_enrolment_updated::update_program_enrolment_row,
        program_enrolment::program_schema::SchemaProgramEnrolment,
        update_program_document::update_program_events,
    },
};

pub(crate) fn sync_upsert_document(
    con: &StorageConnection,
    document: &Document,
) -> Result<(), RepositoryError> {
    // Fetch current document by name to check if the new document is the latest in the DB
    let new_doc_is_latest = is_latest_doc(con, &document.name, document.datetime)?;

    // Insert the new document
    // Note, every document is immutable for which reason an insert (instead of an upsert) is used.
    DocumentRepository::new(con).sync_insert(document)?;

    // Only if the new document is the latest, update the aux tables
    if !new_doc_is_latest {
        return Ok(());
    }
    let Some(registry) = DocumentRegistryRepository::new(con)
        .query_by_filter(
            DocumentRegistryFilter::new().document_type(EqualFilter::equal_to(&document.r#type)),
        )?
        .pop() else {
        log::warn!("Received unknown document type: {}", document.r#type);
        return Ok(());
    };
    match registry.category {
        DocumentRegistryCategory::Patient => update_patient(con, document)?,
        DocumentRegistryCategory::ProgramEnrolment => update_program_enrolment(con, document)?,
        DocumentRegistryCategory::Encounter => update_encounter(con, document)?,
        DocumentRegistryCategory::Custom => {}
    };
    Ok(())
}

fn update_patient(con: &StorageConnection, document: &Document) -> Result<(), RepositoryError> {
    let patient: SchemaPatient = serde_json::from_value(document.data.clone()).map_err(|err| {
        RepositoryError::as_db_error(&format!("Invalid patient data: {}", err), "")
    })?;

    update_patient_row(con, None, &document.datetime, patient, true)
        .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

fn update_program_enrolment(
    con: &StorageConnection,
    document: &Document,
) -> Result<(), RepositoryError> {
    let Some(patient_id) = &document.owner_name_id else {
        return Err(RepositoryError::as_db_error("Document owner id expected", ""));
    };
    let program_enrolment: SchemaProgramEnrolment = serde_json::from_value(document.data.clone())
        .map_err(|err| {
        RepositoryError::as_db_error(&format!("Invalid program enrolment data: {}", err), "")
    })?;
    let program_row = ProgramRepository::new(con)
        .query_one(ProgramFilter::new().context_id(EqualFilter::equal_to(&document.context_id)))?
        .ok_or(RepositoryError::as_db_error("Program row not found", ""))?;
    update_program_enrolment_row(con, patient_id, document, program_enrolment, program_row)
        .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

fn update_encounter(con: &StorageConnection, document: &Document) -> Result<(), RepositoryError> {
    let Some(patient_id) = &document.owner_name_id else {
        return Err(RepositoryError::as_db_error("Document owner id expected", ""));
    };

    let encounter: crate::programs::encounter::validate_misc::ValidatedSchemaEncounter =
        validate_encounter_schema(&document.data).map_err(|err| {
            RepositoryError::as_db_error(&format!("Invalid encounter data: {}", err), "")
        })?;
    let encounter_start_time = encounter.start_datetime;
    let existing_encounter = EncounterRepository::new(con)
        .query_by_filter(
            EncounterFilter::new().document_name(EqualFilter::equal_to(&document.name)),
        )?
        .pop();

    let clinician_id = encounter
        .encounter
        .clinician
        .as_ref()
        .and_then(|c| c.id.clone());
    let program_row = ProgramRepository::new(con)
        .query_one(ProgramFilter::new().context_id(EqualFilter::equal_to(&document.context_id)))?
        .ok_or(RepositoryError::as_db_error("Program row not found", ""))?;
    update_encounter_row(
        con,
        &patient_id,
        document,
        encounter,
        clinician_id,
        program_row,
    )
    .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;

    update_program_events(
        con,
        &patient_id,
        encounter_start_time,
        existing_encounter.map(|(existing, _)| existing.start_datetime),
        &document,
        None,
    )
    .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

#[cfg(test)]
mod integrate_document_test {
    use chrono::{DateTime, NaiveDateTime, Utc};
    use repository::{
        mock::{context_program_a, MockDataInserts},
        test_db::setup_all,
        DocumentStatus, PatientFilter, StringFilter,
    };
    use serde_json::json;
    use util::constants::PATIENT_TYPE;

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn test_integrate_latest_document() {
        let (_, _, connection_manager, _) =
            setup_all("test_integrate_latest_document", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();
        let patient_service = service_provider.patient_service;

        let doc_name = "test/doc";
        let doc_context = context_program_a().id;

        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v1".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(50000, 0).unwrap(),
                    Utc,
                ),
                r#type: PATIENT_TYPE.to_string(),
                data: json!({
                  "id": "id",
                  "firstName": "name1",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: None,
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = patient_service
            .get_patients(
                &context,
                None,
                Some(PatientFilter::new().first_name(StringFilter::starts_with("name"))),
                None,
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(&found.first_name.unwrap(), "name1");

        // adding older document shouldn't update the patient entry
        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v0".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(20000, 0).unwrap(),
                    Utc,
                ),
                r#type: PATIENT_TYPE.to_string(),
                data: json!({
                  "id": "id",
                  "firstName": "name0",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: None,
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = patient_service
            .get_patients(
                &context,
                None,
                Some(PatientFilter::new().first_name(StringFilter::starts_with("name"))),
                None,
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(&found.first_name.unwrap(), "name1");

        // adding newer document should update the patient entry
        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v2".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(100000, 0).unwrap(),
                    Utc,
                ),
                r#type: PATIENT_TYPE.to_string(),
                data: json!({
                  "id": "id",
                  "firstName": "name2",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: None,
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = patient_service
            .get_patients(
                &context,
                None,
                Some(PatientFilter::new().first_name(StringFilter::starts_with("name"))),
                None,
                None,
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        assert_eq!(&found.first_name.unwrap(), "name2");
    }
}
