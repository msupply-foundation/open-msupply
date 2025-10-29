use chrono::{DateTime, Utc};
use repository::{
    Document, DocumentFilter, DocumentRepository, RepositoryError, StorageConnection, StringFilter,
};

pub mod document_registry;
pub mod document_service;
pub mod form_schema_service;
pub mod raw_document;

/// Checks that there is no document in the DB with a datetime greater than the provided `datetime`.
pub(crate) fn is_latest_doc(
    connection: &StorageConnection,
    name: &str,
    datetime: DateTime<Utc>,
) -> Result<(bool, Option<Document>), RepositoryError> {
    // Document repository will always return latest document for a name
    let current_doc = DocumentRepository::new(connection)
        .query_by_filter(DocumentFilter::new().name(StringFilter::equal_to(name)))?
        .pop();
    let new_doc_is_latest = if let Some(ref current_doc) = current_doc {
        current_doc.datetime <= datetime
    } else {
        return Ok((true, None));
    };

    Ok((new_doc_is_latest, current_doc))
}
