use repository::{Document, DocumentFilter, EqualFilter, RepositoryError};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::document::document_service::{DocumentService, DocumentServiceTrait};
use service::service_provider::ServiceProvider;
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
        let ctx = self.service_provider.context()?;
        let service = DocumentService {};
        let jobs = doc_names_by_store(names);
        let mut out = HashMap::new();
        for (store_id, doc_names) in jobs {
            let result = service.get_documents(
                &ctx,
                &store_id,
                Some(DocumentFilter::new().name(Some(EqualFilter::equal_any(
                    doc_names.into_iter().collect(),
                )))),
            )?;
            for doc in result {
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
