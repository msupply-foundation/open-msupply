use repository::{Document, DocumentFilter, RepositoryError, StringFilter};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::{service_provider::ServiceProvider, ListError};
use std::collections::{HashMap, HashSet};

pub struct DocumentLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DocumentLoaderInput {
    pub store_id: String,
    pub document_name: String,
}

fn doc_names_by_store(inputs: &[DocumentLoaderInput]) -> HashMap<String, HashSet<String>> {
    let mut out = HashMap::new();
    for i in inputs {
        let entry = out.entry(i.store_id.clone());
        let set = entry.or_insert(HashSet::new());
        set.insert(i.document_name.clone());
    }
    out
}

#[async_trait::async_trait]
impl Loader<DocumentLoaderInput> for DocumentLoader {
    type Value = Document;
    type Error = RepositoryError;

    async fn load(
        &self,
        names: &[DocumentLoaderInput],
    ) -> Result<HashMap<DocumentLoaderInput, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;
        let jobs = doc_names_by_store(names);
        let mut out = HashMap::new();
        for (store_id, doc_names) in jobs {
            let result = self
                .service_provider
                .document_service
                .documents(
                    &ctx,
                    None,
                    Some(
                        DocumentFilter::new()
                            .name(StringFilter::equal_any(doc_names.into_iter().collect())),
                    ),
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
                out.insert(
                    DocumentLoaderInput {
                        store_id: store_id.clone(),
                        document_name: doc.name.clone(),
                    },
                    doc,
                );
            }
        }

        Ok(out)
    }
}
