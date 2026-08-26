use repository::{DocumentRegistry, RepositoryError};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;
use std::hash::Hasher;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocumentRegistryLoaderInput {
    pub allowed_ctx: Vec<String>,
    pub registry_id: String,
}

impl DocumentRegistryLoaderInput {
    pub fn new(allowed_ctx: &[String], key: &str) -> Self {
        DocumentRegistryLoaderInput {
            allowed_ctx: allowed_ctx.to_vec(),
            registry_id: key.to_string(),
        }
    }
}

impl std::hash::Hash for DocumentRegistryLoaderInput {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.allowed_ctx.hash(state);
        self.registry_id.hash(state);
    }
}

/// Loads document registry for a document type
pub struct DocumentRegistryLoader {
    pub service_provider: Data<ServiceProvider>,
}

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
            let entry = map.entry(item.allowed_ctx.clone()).or_default();
            entry.push(item.registry_id.clone())
        }
        let mut out = HashMap::<DocumentRegistryLoaderInput, Self::Value>::new();

        for (allowed_ctx, document_types) in map.into_iter() {
            let entries = self
                .service_provider
                .document_registry_service
                .get_entries_by_doc_type(
                    &ctx.connection,
                    document_types.to_vec(),
                    Some(&allowed_ctx),
                )?;

            for entry in entries.into_iter() {
                out.insert(
                    DocumentRegistryLoaderInput::new(&allowed_ctx, &entry.document_type),
                    entry,
                );
            }
        }

        Ok(out)
    }
}
