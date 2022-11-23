use repository::{DocumentRegistry, RepositoryError};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;
use std::hash::Hasher;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocumentRegistryLoaderInput {
    pub allowed_docs: Vec<String>,
    pub key: String,
}

impl DocumentRegistryLoaderInput {
    pub fn new(allowed_docs: &Vec<String>, key: &String) -> Self {
        DocumentRegistryLoaderInput {
            allowed_docs: allowed_docs.clone(),
            key: key.clone(),
        }
    }
}

impl std::hash::Hash for DocumentRegistryLoaderInput {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.allowed_docs.hash(state);
        self.key.hash(state);
    }
}

/// Loads document registry for a document type
pub struct DocumentRegistryLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<DocumentRegistryLoaderInput> for DocumentRegistryLoader {
    type Value = DocumentRegistry;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_types: &[DocumentRegistryLoaderInput],
    ) -> Result<HashMap<DocumentRegistryLoaderInput, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;

        let mut map = HashMap::<Vec<String>, Vec<String>>::new();
        for item in document_types {
            let entry = map.entry(item.allowed_docs.clone()).or_insert(vec![]);
            entry.push(item.key.clone())
        }
        let mut out = HashMap::<DocumentRegistryLoaderInput, Self::Value>::new();

        for (allowed_docs, document_types) in map.into_iter() {
            let entries = self
                .service_provider
                .document_registry_service
                .get_entries_by_doc_type(&ctx, document_types.to_vec(), &allowed_docs)?;

            for entry in entries.into_iter() {
                out.insert(
                    DocumentRegistryLoaderInput::new(&allowed_docs, &entry.document_type),
                    entry,
                );
            }
        }

        Ok(out)
    }
}

pub struct DocumentRegistryChildrenLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<DocumentRegistryLoaderInput> for DocumentRegistryChildrenLoader {
    type Value = Vec<DocumentRegistry>;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_ids: &[DocumentRegistryLoaderInput],
    ) -> Result<HashMap<DocumentRegistryLoaderInput, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;

        let mut map = HashMap::<Vec<String>, Vec<String>>::new();
        for item in document_ids {
            let entry = map.entry(item.allowed_docs.clone()).or_insert(vec![]);
            entry.push(item.key.clone())
        }
        let mut out = HashMap::<DocumentRegistryLoaderInput, Self::Value>::new();

        for (allowed_docs, document_ids) in map.into_iter() {
            let children = self
                .service_provider
                .document_registry_service
                .get_children(&ctx, &document_ids, &allowed_docs)?;

            for child in children {
                let parent_id = child.parent_id.clone().ok_or(RepositoryError::DBError {
                    msg: "Error in registry children query".to_string(),
                    extra: "".to_string(),
                })?;
                let entry = out
                    .entry(DocumentRegistryLoaderInput::new(&allowed_docs, &parent_id))
                    .or_insert(vec![]);
                entry.push(child);
            }
        }
        Ok(out)
    }
}
