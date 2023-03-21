use repository::{
    Document, DocumentRegistryFilter, DocumentRegistryRepository, DocumentRepository, EqualFilter,
    RepositoryError, StorageConnection,
};

use crate::programs::{
    encounter::{
        encounter_updated::update_encounter_row, validate_misc::validate_encounter_schema,
    },
    patient::{patient_schema::SchemaPatient, patient_updated::update_patient_row},
    program_enrolment::program_enrolment_updated::update_program_enrolment_row,
    program_enrolment::program_schema::SchemaProgramEnrolment,
};

pub(crate) fn upsert_document(
    con: &StorageConnection,
    document: &Document,
    is_sync_update: bool,
) -> Result<(), RepositoryError> {
    DocumentRepository::new(con).insert(document, is_sync_update)?;

    let Some(registry) = DocumentRegistryRepository::new(con)
        .query_by_filter(
            DocumentRegistryFilter::new().document_type(EqualFilter::equal_to(&document.r#type)),
        )?
        .pop() else {
        return Ok(());
    };

    match registry.context {
        repository::DocumentContext::Patient => update_patient(con, document)?,
        repository::DocumentContext::Program => update_program_enrolment(con, document)?,
        repository::DocumentContext::Encounter => update_encounter(con, document)?,
        repository::DocumentContext::Custom => {}
    };
    Ok(())
}

fn update_patient(con: &StorageConnection, document: &Document) -> Result<(), RepositoryError> {
    let patient: SchemaPatient = serde_json::from_value(document.data.clone()).map_err(|err| {
        RepositoryError::as_db_error(&format!("Invalid patient data: {}", err), "")
    })?;

    update_patient_row(con, &document.datetime, patient, true)
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
    update_program_enrolment_row(con, patient_id, document, program_enrolment)
        .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}

fn update_encounter(con: &StorageConnection, document: &Document) -> Result<(), RepositoryError> {
    let (Some(patient_id), Some(program)) = (&document.owner_name_id, &document.context) else {
        return Err(RepositoryError::as_db_error("Document owner id and context expected", ""));
    };

    let encounter = validate_encounter_schema(&document.data).map_err(|err| {
        RepositoryError::as_db_error(&format!("Invalid encounter data: {}", err), "")
    })?;

    let clinician_id = encounter
        .encounter
        .clinician
        .as_ref()
        .and_then(|c| c.id.clone());
    update_encounter_row(
        con,
        &patient_id,
        &program,
        document,
        encounter,
        clinician_id,
    )
    .map_err(|err| RepositoryError::as_db_error(&format!("{:?}", err), ""))?;
    Ok(())
}
