use repository::name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinRowRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct NameInsuranceJoinLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for NameInsuranceJoinLoader {
    type Value = NameInsuranceJoinRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, NameInsuranceJoinRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = NameInsuranceJoinRowRepository::new(&connection);

                let result = repo.find_many_by_ids(&ids)?;

                Ok(result
                    .into_iter()
                    .map(|row| (row.id.clone(), row))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
