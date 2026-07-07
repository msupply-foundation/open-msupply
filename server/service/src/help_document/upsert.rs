use repository::{
    HelpDocument, HelpDocumentRepository, HelpDocumentRow, HelpDocumentRowRepository,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertHelpDocumentError {
    HelpDocumentAlreadyExists,
    EmptyTitle,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct InsertHelpDocument {
    pub id: String,
    pub title: String,
}

pub fn insert_help_document(
    ctx: &ServiceContext,
    input: InsertHelpDocument,
) -> Result<HelpDocument, InsertHelpDocumentError> {
    ctx.connection
        .transaction_sync(|connection| {
            let trimmed_title = input.title.trim();
            if trimmed_title.is_empty() {
                return Err(InsertHelpDocumentError::EmptyTitle);
            }

            let repo = HelpDocumentRowRepository::new(connection);
            if repo.find_one_by_id(&input.id)?.is_some() {
                return Err(InsertHelpDocumentError::HelpDocumentAlreadyExists);
            }

            let row = HelpDocumentRow {
                id: input.id.clone(),
                title: trimmed_title.to_string(),
                created_datetime: chrono::Utc::now().naive_utc(),
                deleted_datetime: None,
            };
            repo.upsert_one(&row)?;

            HelpDocumentRepository::new(connection)
                .query_by_filter(repository::HelpDocumentFilter::new().id(
                    repository::EqualFilter::equal_to(input.id.clone()),
                ))?
                .pop()
                .ok_or(InsertHelpDocumentError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())
}

impl From<RepositoryError> for InsertHelpDocumentError {
    fn from(error: RepositoryError) -> Self {
        InsertHelpDocumentError::DatabaseError(error)
    }
}
