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
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(Pagination::new(), filter, sort)?)
    }

    fn get_entries_by_doc_type(
        &self,
        ctx: &ServiceContext,
        types: Vec<String>,
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(
            Pagination::new(),
            Some(DocumentRegistryFilter::new().document_type(EqualFilter::equal_any(types))),
            None,
        )?)
    }

    fn get_children(
        &self,
        ctx: &ServiceContext,
        parent_ids: &[String],
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(
            Pagination::new(),
            Some(
                DocumentRegistryFilter::new()
                    .parent_id(EqualFilter::equal_any(parent_ids.to_vec())),
            ),
            None,
        )?)
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        input: InsertDocumentRegistry,
    ) -> Result<DocumentRegistry, InsertDocRegistryError> {
        insert(ctx, input)
    }
}

pub struct DocumentRegistryService {}
impl DocumentRegistryServiceTrait for DocumentRegistryService {}
