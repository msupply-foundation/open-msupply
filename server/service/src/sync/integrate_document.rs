use repository::{
    Document, DocumentRegistryCategory, DocumentRegistryFilter, DocumentRegistryRepository,
    DocumentRepository, EncounterFilter, EncounterRepository, EqualFilter, ProgramFilter,
    ProgramRepository, RepositoryError, StorageConnection, Upsert,
};

use crate::{
    document::is_latest_doc,
    programs::{
        contact_trace::{
            contact_trace_schema::SchemaContactTrace,
            contact_trace_updated::update_contact_trace_row,
        },
        encounter::{encounter_updated, validate_misc::validate_encounter_schema},
        program_enrolment::program_enrolment_updated::update_program_enrolment_row,
        program_enrolment::program_schema::SchemaProgramEnrolment,
    },
};
#[derive(Debug)]
pub(crate) struct DocumentUpsert(pub(crate) Document);

impl Upsert for DocumentUpsert {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        sync_upsert_document(con, &self.0)
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DocumentRepository::new(con).find_one_by_id(&self.0.id),
            Ok(Some(self.0.clone()))
        );
    }
}

fn sync_upsert_document(
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
        .pop()
    else {
        log::warn!("Received unknown document type: {}", document.r#type);
        return Ok(());
    };
    match registry.category {
        DocumentRegistryCategory::Patient => {
            // patient name row should already have been synced
        }
        DocumentRegistryCategory::ProgramEnrolment => update_program_enrolment(con, document)?,
        DocumentRegistryCategory::Encounter => update_encounter(con, document)?,
        DocumentRegistryCategory::ContactTrace => update_contact_trace(con, document)?,
        DocumentRegistryCategory::Custom => {}
    };
    Ok(())
}

fn update_program_enrolment(
    con: &StorageConnection,
    document: &Document,
) -> Result<(), RepositoryError> {
    let Some(patient_id) = &document.owner_name_id else {
        return Err(RepositoryError::as_db_error(
            "Document owner id expected",
            "",
        ));
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
        return Err(RepositoryError::as_db_error(
            "Document owner id expected",
            "",
        ));
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
    encounter_updated::update_encounter_row_and_events(
        con,
        &patient_id,
        document,
        encounter,
        clinician_id,
        program_row,
        encounter_start_time,
        existing_encounter.map(|encounter| encounter.row.start_datetime),
        None,
    )
    .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

fn update_contact_trace(
    con: &StorageConnection,
    document: &Document,
) -> Result<(), RepositoryError> {
    let Some(patient_id) = &document.owner_name_id else {
        return Err(RepositoryError::as_db_error(
            "Document owner id expected",
            "",
        ));
    };
    let contact_trace: SchemaContactTrace =
        serde_json::from_value(document.data.clone()).map_err(|err| {
            RepositoryError::as_db_error(&format!("Invalid contact trace data: {}", err), "")
        })?;
    let program_row = ProgramRepository::new(con)
        .query_one(ProgramFilter::new().context_id(EqualFilter::equal_to(&document.context_id)))?
        .ok_or(RepositoryError::as_db_error("Program row not found", ""))?;
    update_contact_trace_row(con, patient_id, document, contact_trace, program_row)
        .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

#[cfg(test)]
mod integrate_document_test {
    use chrono::{DateTime, Utc};
    use repository::{
        mock::{context_program_a, document_registry_b, mock_patient, MockDataInserts},
        test_db::setup_all,
        DocumentStatus, Pagination, ProgramEnrolmentFilter, StringFilter,
    };
    use serde_json::json;

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn test_integrate_latest_document() {
        let (_, _, connection_manager, _) =
            setup_all("test_integrate_latest_document", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.program_enrolment_service;

        let doc_name = "test/doc";
        let doc_context = context_program_a().id;

        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v1".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_naive_utc_and_offset(
                    DateTime::from_timestamp(50000, 0).unwrap().naive_utc(),
                    Utc,
                ),
                r#type: document_registry_b().document_type,
                data: json!({
                  "enrolmentDatetime": "2023-11-28T18:24:57.184Z",
                  "status": "ACTIVE",
                  "programEnrolmentId": "name1",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: Some(mock_patient().id),
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = service
            .program_enrolments(
                &context,
                Pagination::all(),
                None,
                Some(
                    ProgramEnrolmentFilter::new()
                        .program_enrolment_id(StringFilter::starts_with("name")),
                ),
                vec![doc_context.clone()],
            )
            .unwrap()
            .pop()
            .unwrap()
            .row;
        assert_eq!(&found.program_enrolment_id.unwrap(), "name1");

        // adding older document shouldn't update the patient entry
        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v0".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_naive_utc_and_offset(
                    DateTime::from_timestamp(20000, 0).unwrap().naive_utc(),
                    Utc,
                ),
                r#type: document_registry_b().document_type,
                data: json!({
                    "enrolmentDatetime": "2023-11-27T18:24:57.184Z",
                    "status": "ACTIVE",
                    "programEnrolmentId": "name0",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: Some(mock_patient().id),
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = service
            .program_enrolments(
                &context,
                Pagination::all(),
                None,
                Some(
                    ProgramEnrolmentFilter::new()
                        .program_enrolment_id(StringFilter::starts_with("name")),
                ),
                vec![doc_context.clone()],
            )
            .unwrap()
            .pop()
            .unwrap()
            .row;
        assert_eq!(&found.program_enrolment_id.unwrap(), "name1");

        // adding newer document should update the patient entry
        sync_upsert_document(
            &context.connection,
            &Document {
                id: "v2".to_string(),
                name: doc_name.to_string(),
                parent_ids: vec![],
                user_id: "me".to_string(),
                datetime: DateTime::<Utc>::from_naive_utc_and_offset(
                    DateTime::from_timestamp(100000, 0).unwrap().naive_utc(),
                    Utc,
                ),
                r#type: document_registry_b().document_type,
                data: json!({
                    "enrolmentDatetime": "2023-11-30T18:24:57.184Z",
                    "status": "ACTIVE",
                    "programEnrolmentId": "name2",
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: Some(mock_patient().id),
                context_id: doc_context.clone(),
            },
        )
        .unwrap();
        let found = service
            .program_enrolments(
                &context,
                Pagination::all(),
                None,
                Some(
                    ProgramEnrolmentFilter::new()
                        .program_enrolment_id(StringFilter::starts_with("name")),
                ),
                vec![doc_context.clone()],
            )
            .unwrap()
            .pop()
            .unwrap()
            .row;
        assert_eq!(&found.program_enrolment_id.unwrap(), "name2");
    }
}
