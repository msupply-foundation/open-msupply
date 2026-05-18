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
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, FormSchema>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = FormSchemaRowRepository::new(&connection);
                let result = repo.find_many_by_ids(&ids)?;
                Ok(result
                    .into_iter()
                    .map(|entry| (entry.id.clone(), entry))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
