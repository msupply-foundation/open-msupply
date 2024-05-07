use super::{
    contact_trace_schema::{SchemaContactTrace, SchemaGender},
    upsert::UpsertContactTraceError,
};
use chrono::{DateTime, NaiveDate};
use repository::{
    contact_trace::{ContactTraceFilter, ContactTraceRepository},
    contact_trace_row::{ContactTraceRow, ContactTraceRowRepository},
    Document, GenderType, ProgramRow, StorageConnection, StringFilter,
};
use std::str::FromStr;
use util::hash::sha256;

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
                "Invalid contact trace datetime format: {}",
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
    // Documents are identified by a human readable name. Thus, use hash(name) as an ID.
    // For example, an ID works better in an web URL.
    // This also makes sure the table row gets the same ID when the whole site is re-synced.
    let id = match contact_trace_row {
        Some(contact_trace_row) => contact_trace_row.contact_trace.id,
        None => sha256(&document.name),
    };

    let store_id = contact_trace
        .location
        .as_ref()
        .and_then(|l| l.store_id.clone());
    let contact = contact_trace.contact.as_ref();

    let row = ContactTraceRow {
        id,
        program_id: program_row.id,
        document_id: document.id.clone(),
        patient_id: patient_id.to_string(),
        datetime,
        contact_trace_id: contact_trace.contact_trace_id,
        contact_patient_id: contact.and_then(|c| c.id.clone()),
        first_name: contact.and_then(|c| c.first_name.clone()),
        last_name: contact_trace
            .contact
            .as_ref()
            .and_then(|c| c.last_name.clone()),
        gender: contact.and_then(|c| {
            c.gender.as_ref().map(|g| match g {
                SchemaGender::Female => GenderType::Female,
                SchemaGender::Male => GenderType::Male,
                SchemaGender::Transgender => GenderType::Transgender,
                SchemaGender::TransgenderMale => GenderType::TransgenderMale,
                SchemaGender::TransgenderFemale => GenderType::TransgenderFemale,
                SchemaGender::Unknown => GenderType::Unknown,
                SchemaGender::NonBinary => GenderType::NonBinary,
            })
        }),
        date_of_birth: contact
            .and_then(|c| match &c.date_of_birth {
                Some(date_of_birth) => Some(NaiveDate::from_str(&date_of_birth).map_err(|err| {
                    UpsertContactTraceError::InternalError(format!(
                        "Invalid date of birth format: {}",
                        err
                    ))
                })),
                None => None,
            })
            .transpose()?,
        store_id,
        relationship: contact.and_then(|c| c.relationship.clone()),
    };
    ContactTraceRowRepository::new(con).upsert_one(&row)?;

    Ok(row)
}
