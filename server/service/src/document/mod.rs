use repository::{Document, RepositoryError};

use crate::service_provider::{ServiceContext, ServiceProvider};

pub mod document_registry;
pub mod document_service;
pub mod form_schema_service;
pub mod raw_document;

/// Checks if the doc is the latest in the DB
pub(crate) fn is_latest_doc(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    doc: &Document,
) -> Result<bool, RepositoryError> {
    let latest_existing = service_provider
        .document_service
        .document(ctx, &doc.name, None)?;
    Ok(latest_existing.map(|e| e.id == doc.id).unwrap_or(false))
}
