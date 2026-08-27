use repository::{FormSchema, FormSchemaRowRepository, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct JsonSchemaLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for JsonSchemaLoader {
    type Value = FormSchema;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = FormSchemaRowRepository::new(&connection);
        let result = repo.find_many_by_ids(ids)?;
        Ok(result
            .into_iter()
            .map(|entry| (entry.id.clone(), entry))
            .collect())
    }
}
