use repository::{
    Document, DocumentFilter, DocumentRepository, EqualFilter, Pagination, RepositoryError,
    StringFilter,
};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

/// Load document by name
pub struct DocumentLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for DocumentLoader {
    type Value = Document;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_names: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;
        let mut out = HashMap::new();
        let doc_names = document_names.to_vec();

        let result = DocumentRepository::new(&ctx.connection).query(
            Pagination::all(),
            Some(DocumentFilter::new().name(StringFilter::equal_any(doc_names))),
            None,
        )?;

        for doc in result {
            out.insert(doc.name.clone(), doc);
        }

        Ok(out)
    }
}

/// Load document by id
pub struct DocumentByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for DocumentByIdLoader {
    type Value = Document;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;
        let mut out = HashMap::new();
        let doc_ids = document_ids.to_vec();

        let result = DocumentRepository::new(&ctx.connection).query(
            Pagination::all(),
            Some(DocumentFilter::new().id(EqualFilter::equal_any(doc_ids))),
            None,
        )?;

        for doc in result {
            out.insert(doc.id.clone(), doc);
        }

        Ok(out)
    }
}
