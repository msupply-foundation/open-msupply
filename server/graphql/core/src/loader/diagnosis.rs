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
        let connection = self.connection_manager.connection()?;
        let repo = DiagnosisRepository::new(&connection);

        let result = repo
            .query_by_filter(DiagnosisFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|diagnosis| (diagnosis.id.clone(), diagnosis))
            .collect())
    }
}
