use repository::{Document, DocumentFilter, RepositoryError, StringFilter};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::{service_provider::ServiceProvider, ListError};
use std::collections::HashMap;

pub struct DocumentLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for DocumentLoader {
    type Value = Document;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_names: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;
        let mut out = HashMap::new();
        let doc_names = document_names.iter().map(|n| n.clone()).collect::<Vec<_>>();
        let result = self
            .service_provider
            .document_service
            .documents(
                &ctx,
                None,
                Some(DocumentFilter::new().name(StringFilter::equal_any(doc_names))),
                None,
                None,
            )
            .map_err(|err| match err {
                ListError::DatabaseError(err) => err,
                ListError::LimitBelowMin(_) => RepositoryError::DBError {
                    msg: "Internal error: pagination was not specified".to_string(),
                    extra: "".to_string(),
                },
                ListError::LimitAboveMax(_) => RepositoryError::DBError {
                    msg: "Internal error: pagination was not specified".to_string(),
                    extra: "".to_string(),
                },
            })?;
        for doc in result.rows {
            out.insert(doc.name.clone(), doc);
        }

        Ok(out)
    }
}
