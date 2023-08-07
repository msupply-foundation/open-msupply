use chrono::DateTime;
use repository::{
    contact_trace::{ContactTraceFilter, ContactTraceRepository},
    contact_trace_row::{ContactTraceRow, ContactTraceRowRepository, ContactTraceStatus},
    Document, ProgramRow, StorageConnection, StringFilter,
};
use util::uuid::uuid;

use super::{contact_trace_schema::SchemaContactTrace, upsert::UpsertContactTraceError};

/// Callback called when a program enrolment document has been updated
pub(crate) fn update_contact_trace_row(
    con: &StorageConnection,
    root_patient_id: &str,
    document: &Document,
    contact_trace: SchemaContactTrace,
    program_row: ProgramRow,
) -> Result<ContactTraceRow, UpsertContactTraceError> {
    let datetime = DateTime::parse_from_rfc3339(&contact_trace.datetime)
        .map_err(|err| {
            UpsertContactTraceError::InternalError(format!(
                "Invalid enrolment datetime format: {}",
                err
            ))
        })?
        .naive_utc();

    // Retrieve existing or create now contact trace id
    let repo = ContactTraceRepository::new(con);
    let contact_trace_row = repo
        .query_by_filter(ContactTraceFilter {
            document_name: Some(StringFilter::equal_to(&program_row.id)),
            ..ContactTraceFilter::default()
        })?
        .pop();
    let contact_trace_id = match contact_trace_row {
        Some(contact_trace_row) => contact_trace_row.0.id,
        None => uuid(),
    };

    let status = match contact_trace.status {
        super::contact_trace_schema::ContactTraceStatus::Pending => ContactTraceStatus::Pending,
        super::contact_trace_schema::ContactTraceStatus::Done => ContactTraceStatus::Done,
    };

    let row = ContactTraceRow {
        id: contact_trace_id,
        program_id: program_row.id,
        document_id: document.id.clone(),
        root_patient_id: root_patient_id.to_string(),
        datetime,
        status,
        contact_trace_id: contact_trace.contact_trace_id,
        patient_id: contact_trace.id,
        first_name: contact_trace.first_name,
        last_name: contact_trace.last_name,
    };
    ContactTraceRowRepository::new(con).upsert_one(&row)?;

    Ok(row)
}
