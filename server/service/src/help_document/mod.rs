mod delete;
mod query;
mod upsert;

pub use delete::{delete_help_document, DeleteHelpDocument, DeleteHelpDocumentError};
pub use query::{get_help_document, get_help_documents};
pub use upsert::{insert_help_document, InsertHelpDocument, InsertHelpDocumentError};

use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{HelpDocument, HelpDocumentFilter, HelpDocumentSort, PaginationOption};

pub trait HelpDocumentServiceTrait: Send + Sync {
    fn get_help_documents(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<HelpDocumentFilter>,
        sort: Option<HelpDocumentSort>,
    ) -> Result<ListResult<HelpDocument>, ListError> {
        get_help_documents(ctx, pagination, filter, sort)
    }

    fn get_help_document(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<HelpDocument>, repository::RepositoryError> {
        get_help_document(ctx, id)
    }

    fn insert_help_document(
        &self,
        ctx: &ServiceContext,
        input: InsertHelpDocument,
    ) -> Result<HelpDocument, InsertHelpDocumentError> {
        insert_help_document(ctx, input)
    }

    fn delete_help_document(
        &self,
        ctx: &ServiceContext,
        input: DeleteHelpDocument,
    ) -> Result<String, DeleteHelpDocumentError> {
        delete_help_document(ctx, input)
    }
}

pub struct HelpDocumentService;
impl HelpDocumentServiceTrait for HelpDocumentService {}
