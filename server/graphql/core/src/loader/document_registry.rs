use repository::{DocumentRegistry, RepositoryError};

use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct DocumentRegistryLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for DocumentRegistryLoader {
    type Value = DocumentRegistry;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_types: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;

        let entries = self
            .service_provider
            .document_registry_service
            .get_entries_by_doc_type(&ctx, document_types.to_vec())?;

        let mut out = HashMap::new();
        for entry in entries {
            out.insert(entry.document_type.clone(), entry);
        }

        Ok(out)
    }
}

pub struct DocumentRegistryChildrenLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for DocumentRegistryChildrenLoader {
    type Value = Vec<DocumentRegistry>;
    type Error = RepositoryError;

    async fn load(
        &self,
        document_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let ctx = self.service_provider.basic_context()?;

        let children = self
            .service_provider
            .document_registry_service
            .get_children(&ctx, document_ids)?;

        let mut out = HashMap::new();
        for child in children {
            let parent_id = child.parent_id.clone().ok_or(RepositoryError::DBError {
                msg: "Error in registry children query".to_string(),
                extra: "".to_string(),
            })?;
            let entry = out.entry(parent_id).or_insert(vec![]);
            entry.push(child);
        }

        Ok(out)
    }
}
