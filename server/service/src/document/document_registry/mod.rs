use repository::{DocumentRegistry, DocumentRegistryRepository, Pagination, RepositoryError};

use crate::service_provider::ServiceContext;

use self::insert::{insert, InsertDocRegistryError, InsertDocumentRegistry};

mod insert;

pub enum DocumentRegistryError {
    InternalError(String),
    RepositoryError(RepositoryError),
}

pub trait DocumentRegistryServiceTrait: Sync + Send {
    fn get_entries(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Vec<DocumentRegistry>, DocumentRegistryError> {
        let repo = DocumentRegistryRepository::new(&ctx.connection);
        Ok(repo.query(Pagination::new(), None, None)?)
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        input: InsertDocumentRegistry,
    ) -> Result<(), InsertDocRegistryError> {
        insert(ctx, input)
    }
}

pub struct DocumentRegistryService {}
impl DocumentRegistryServiceTrait for DocumentRegistryService {}

impl From<RepositoryError> for DocumentRegistryError {
    fn from(err: RepositoryError) -> Self {
        DocumentRegistryError::RepositoryError(err)
    }
}
