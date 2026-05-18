use repository::diagnosis::{Diagnosis, DiagnosisFilter, DiagnosisRepository};
use repository::{EqualFilter, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct DiagnosisLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for DiagnosisLoader {
    type Value = Diagnosis;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Diagnosis>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = DiagnosisRepository::new(&connection);

                let result = repo
                    .query_by_filter(DiagnosisFilter::new().id(EqualFilter::equal_any(ids)))?;

                Ok(result
                    .into_iter()
                    .map(|diagnosis| (diagnosis.id.clone(), diagnosis))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
