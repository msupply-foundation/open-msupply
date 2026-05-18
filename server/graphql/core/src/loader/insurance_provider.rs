use repository::InsuranceProviderRow;
use repository::{
    insurance_provider_row::InsuranceProviderRowRepository, RepositoryError,
    StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InsuranceProviderByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for InsuranceProviderByIdLoader {
    type Value = InsuranceProviderRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, InsuranceProviderRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = InsuranceProviderRowRepository::new(&connection);

                let result = repo.find_many_by_ids(&ids)?;

                Ok(result
                    .into_iter()
                    .map(|insurance_provider| (insurance_provider.id.clone(), insurance_provider))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
