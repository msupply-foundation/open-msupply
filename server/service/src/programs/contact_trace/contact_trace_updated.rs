use chrono::DateTime;
use repository::{
    contact_trace::{ContactTraceFilter, ContactTraceRepository},
    contact_trace_row::{ContactTraceRow, ContactTraceRowRepository, ContactTraceStatus},
    Document, ProgramRow, StorageConnection, StringFilter,
};
use util::hash::sha256;

use super::{contact_trace_schema::SchemaContactTrace, upsert::UpsertContactTraceError};

/// Callback called when a program enrolment document has been updated
pub(crate) fn update_contact_trace_row(
    con: &StorageConnection,
    patient_id: &str,
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
            document_name: Some(StringFilter::equal_to(&document.name)),
            ..ContactTraceFilter::default()
        })?
        .pop();
    let contact_trace_id = match contact_trace_row {
        Some(contact_trace_row) => contact_trace_row.0.id,
        None => sha256(&document.name),
    };

    let status = match contact_trace.status {
        super::contact_trace_schema::ContactTraceStatus::Pending => ContactTraceStatus::Pending,
        super::contact_trace_schema::ContactTraceStatus::Done => ContactTraceStatus::Done,
    };

    let row = ContactTraceRow {
        id: contact_trace_id,
        program_id: program_row.id,
        document_id: document.id.clone(),
        patient_id: patient_id.to_string(),
        datetime,
        status,
        contact_trace_id: contact_trace.contact_trace_id,
        contact_patient_id: contact_trace.contact.as_ref().and_then(|c| c.id.clone()),
        first_name: contact_trace
            .contact
            .as_ref()
            .and_then(|c| c.first_name.clone()),
        last_name: contact_trace
            .contact
            .as_ref()
            .and_then(|c| c.last_name.clone()),
    };
    ContactTraceRowRepository::new(con).upsert_one(&row)?;

    Ok(row)
}
