use repository::{
    DocumentRegistry, DocumentRegistryFilter, DocumentRegistryRepository, DocumentRegistrySort,
    EqualFilter, Pagination, RepositoryError,
};

use crate::service_provider::ServiceContext;

pub use self::insert::*;

mod insert;

#[cfg(test)]
mod tests;

pub trait DocumentRegistryServiceTrait: Sync + Send {
    fn get_entries(
        &self,
        ctx: &ServiceContext,
        filter: Option<DocumentRegistryFilter>,
        sort: Option<DocumentRegistrySort>,
        allowed_ctx: &[String],
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        let mut filter = filter.unwrap_or(DocumentRegistryFilter::new());
        filter.context_id = Some(
            filter
                .context_id
                .unwrap_or_default()
                .restrict_results(allowed_ctx),
        );

        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(Pagination::new(), Some(filter), sort)?)
    }

    fn get_entries_by_doc_type(
        &self,
        ctx: &ServiceContext,
        types: Vec<String>,
        allowed_ctx: &[String],
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(
            Pagination::new(),
            Some(
                DocumentRegistryFilter::new()
                    .context_id(EqualFilter::default().restrict_results(allowed_ctx))
                    .document_type(EqualFilter::equal_any(types)),
            ),
            None,
        )?)
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        input: InsertDocumentRegistry,
        allowed_ctx: &[String],
    ) -> Result<DocumentRegistry, InsertDocRegistryError> {
        insert(ctx, input, allowed_ctx)
    }
}

pub struct DocumentRegistryService {}
impl DocumentRegistryServiceTrait for DocumentRegistryService {}
