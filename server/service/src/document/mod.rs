use repository::RepositoryError;

use crate::service_provider::{ServiceContext, ServiceProvider};

use self::raw_document::RawDocument;

pub mod document_registry;
pub mod document_service;
pub mod form_schema_service;
pub mod raw_document;

/// Checks that there is no document with a later timestamp
pub(crate) fn is_latest_doc(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    doc: &RawDocument,
) -> Result<bool, RepositoryError> {
    let latest_existing = service_provider
        .document_service
        .get_document(ctx, &doc.name)?;
    if let Some(lastest_existing) = latest_existing {
        if lastest_existing.timestamp > doc.timestamp {
            // newer doc already exist
            return Ok(false);
        }
    }
    Ok(true)
}
