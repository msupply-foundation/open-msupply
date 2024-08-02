use chrono::NaiveDateTime;
use repository::{
    Document, EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository,
    EncounterStatus, EqualFilter, ProgramRow, RepositoryError, StorageConnection,
};
use util::hash::sha256;

use crate::programs::{
    program_event::{ProgramEventService, ProgramEventServiceTrait},
    update_program_document::{update_program_events, UpdateProgramDocumentError},
};

use super::{
    encounter_schema::{self},
    validate_misc::ValidatedSchemaEncounter,
};

pub(crate) fn update_encounter_row_and_events(
    con: &StorageConnection,
    patient_id: &str,
    document: &Document,
    validated_encounter: ValidatedSchemaEncounter,
    clinician_id: Option<String>,
    program_row: ProgramRow,
    base_time: NaiveDateTime,
    previous_base_time: Option<NaiveDateTime>,
    allowed_ctx: Option<&[String]>,
) -> Result<(), UpdateProgramDocumentError> {
    let is_deleted = validated_encounter
        .encounter
        .status
        .as_ref()
        .map(|s| s == &encounter_schema::EncounterStatus::Deleted)
        .unwrap_or(false);

    update_encounter_row(
        con,
        patient_id,
        document,
        validated_encounter,
        clinician_id,
        program_row,
    )?;

    if is_deleted {
        // delete events from previous base time
        if let Some(previous_base_time) = previous_base_time {
            ProgramEventService {}.upsert_events(
                con,
                patient_id.to_string(),
                previous_base_time,
                &document.context_id,
                vec![],
            )?;
        }
    } else {
        update_program_events(
            con,
            patient_id,
            base_time,
            previous_base_time,
            document,
            allowed_ctx,
        )?;
    }
    Ok(())
}

/// Callback called when the document has been updated
fn update_encounter_row(
    con: &StorageConnection,
    patient_id: &str,
    doc: &Document,
    validated_encounter: ValidatedSchemaEncounter,
    clinician_id: Option<String>,
    program_row: ProgramRow,
) -> Result<(), RepositoryError> {
    let status = validated_encounter
        .encounter
        .status
        .map(|status| match status {
            encounter_schema::EncounterStatus::Pending => EncounterStatus::Pending,
            encounter_schema::EncounterStatus::Visited => EncounterStatus::Visited,
            encounter_schema::EncounterStatus::Cancelled => EncounterStatus::Cancelled,
            encounter_schema::EncounterStatus::Deleted => EncounterStatus::Deleted,
        });

    let repo = EncounterRepository::new(con);
    let encounter = repo
        .query_by_filter(EncounterFilter::new().document_name(EqualFilter::equal_to(&doc.name)))?
        .pop();
    // Documents are identified by a human readable name. Thus, use hash(name) as an ID.
    // For example, an ID works better in an web URL.
    // This also makes sure the table row gets the same ID when the whole site is re-synced.
    let id = match encounter {
        Some(encounter) => encounter.row.id,
        None => sha256(&doc.name),
    };
    let row = EncounterRow {
        id,
        document_type: doc.r#type.clone(),
        document_name: doc.name.clone(),
        patient_link_id: patient_id.to_string(),
        program_id: program_row.id,
        created_datetime: validated_encounter.created_datetime,
        start_datetime: validated_encounter.start_datetime,
        end_datetime: validated_encounter.end_datetime,
        status,
        clinician_link_id: clinician_id,
        store_id: validated_encounter
            .encounter
            .location
            .and_then(|l| l.store_id),
    };
    EncounterRowRepository::new(con).upsert_one(&row)?;

    Ok(())
}

#[cfg(test)]
mod encounter_document_updated_test {
    use chrono::{DateTime, Timelike, Utc};
    use repository::{
        mock::{
            context_program_a, mock_form_schema_simplified_encounter,
            mock_form_schema_simplified_enrolment, mock_patient, MockDataInserts,
        },
        test_db::setup_all,
        EqualFilter, ProgramEventFilter,
    };
    use serde_json::json;

    use crate::{
        programs::{
            encounter::{InsertEncounter, UpdateEncounter},
            program_enrolment::UpsertProgramEnrolment,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_encounter_deletion() {
        let (_, _, connection_manager, _) =
            setup_all("test_encounter_deletion", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();

        let patient = mock_patient();
        let program_context = context_program_a().id;

        service_provider
            .program_enrolment_service
            .upsert_program_enrolment(
                &context,
                &service_provider,
                "user",
                UpsertProgramEnrolment {
                    patient_id: patient.id.clone(),
                    r#type: "TestEnrolment".to_string(),
                    data: json!({
                        "enrolmentDatetime": Utc::now().with_nanosecond(0).unwrap().to_rfc3339(),
                        "programEnrolmentId": Some("patient id 1".to_string()),
                    }),
                    schema_id: mock_form_schema_simplified_enrolment().id.clone(),
                    parent: None,
                },
                vec![program_context.clone()],
            )
            .unwrap();

        let insert_and_delete = |insert_time: i64, delete_time: i64| {
            let encounter = service_provider
            .encounter_service
            .insert_encounter(
                &context,
                &service_provider,
                "user",
                InsertEncounter {
                    patient_id: patient.id.clone(),
                    r#type: "TestEncounter".to_string(),
                    data: json!({
                        "createdDatetime": DateTime::from_timestamp(insert_time, 0).unwrap().to_rfc3339(),
                        "startDatetime": DateTime::from_timestamp(insert_time, 0).unwrap().to_rfc3339(),
                        "extension": {
                            "test": true
                        }
                    }),
                    schema_id: mock_form_schema_simplified_encounter().id,
                    event_datetime: Utc::now(),
                },
                vec![program_context.clone()],
            )
            .unwrap();
            let events = service_provider
                .program_event_service
                .events(
                    &context,
                    None,
                    Some(ProgramEventFilter::new().patient_id(EqualFilter::equal_to(&patient.id))),
                    None,
                    None,
                )
                .unwrap();
            assert_eq!(events.count, 1);
            assert_eq!(
                &events.rows[0]
                    .program_event_row
                    .data
                    .as_ref()
                    .unwrap()
                    .as_str(),
                &"Test"
            );

            // delete encounter should remove the events
            service_provider
            .encounter_service
            .update_encounter(
                &context,
                &service_provider,
                "user",
                UpdateEncounter {
                    r#type: "TestEncounter".to_string(),
                    parent: encounter.id,
                    data: json!({
                        "createdDatetime": DateTime::from_timestamp(delete_time, 0).unwrap().to_rfc3339(),
                        "startDatetime": DateTime::from_timestamp(delete_time, 0).unwrap().to_rfc3339(),
                        "extension": {
                            "test": true
                        },
                        "status": "DELETED"
                    }),
                    schema_id: mock_form_schema_simplified_encounter().id,
                },
                vec![program_context.clone()],
            )
            .unwrap();
            let events = service_provider
                .program_event_service
                .events(
                    &context,
                    None,
                    Some(ProgramEventFilter::new().patient_id(EqualFilter::equal_to(&patient.id))),
                    None,
                    None,
                )
                .unwrap();
            assert_eq!(events.count, 0);
        };

        // quite unrealistic but test anyway:
        insert_and_delete(2000, 2000);
        // common case; insert time < delete time:
        insert_and_delete(3000, 3001);
        // for good measure test insert time > delete time:
        insert_and_delete(4002, 4001);
    }
}
