use repository::{
    EqualFilter, HelpDocumentRowRepository, RepositoryError, SyncFileReferenceFilter,
    SyncFileReferenceRepository, SyncFileReferenceRowRepository,
};

use crate::service_provider::ServiceContext;

pub const HELP_DOCUMENT_TABLE: &str = "help_document";

#[derive(PartialEq, Debug)]
pub enum DeleteHelpDocumentError {
    HelpDocumentDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(Clone, Default)]
pub struct DeleteHelpDocument {
    pub id: String,
}

pub fn delete_help_document(
    ctx: &ServiceContext,
    input: DeleteHelpDocument,
) -> Result<String, DeleteHelpDocumentError> {
    ctx.connection
        .transaction_sync(|connection| {
            let help_doc_repo = HelpDocumentRowRepository::new(connection);
            let existing = help_doc_repo.find_one_by_id(&input.id)?;
            let Some(row) = existing else {
                return Err(DeleteHelpDocumentError::HelpDocumentDoesNotExist);
            };
            if row.deleted_datetime.is_some() {
                return Err(DeleteHelpDocumentError::HelpDocumentDoesNotExist);
            }

            // Soft-delete the file refs so the deletion (and disk cleanup) propagates
            // to remotes — mirrors the requisition attachment pattern.
            let file_refs = SyncFileReferenceRepository::new(connection).query_by_filter(
                SyncFileReferenceFilter::new()
                    .table_name(EqualFilter::equal_to(HELP_DOCUMENT_TABLE.to_string()))
                    .record_id(EqualFilter::equal_to(input.id.clone()))
                    .is_deleted(false),
            )?;
            let file_ref_repo = SyncFileReferenceRowRepository::new(connection);
            for file_ref in file_refs {
                file_ref_repo.delete(&file_ref.sync_file_reference_row.id)?;
            }

            help_doc_repo.mark_deleted(&input.id)?;
            Ok(input.id.clone())
        })
        .map_err(|error| error.to_inner_error())
}

impl From<RepositoryError> for DeleteHelpDocumentError {
    fn from(error: RepositoryError) -> Self {
        DeleteHelpDocumentError::DatabaseError(error)
    }
}
