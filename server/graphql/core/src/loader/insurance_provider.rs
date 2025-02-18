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
        let connection = self.connection_manager.connection()?;
        let repo = InsuranceProviderRowRepository::new(&connection);

        let result = repo.find_many_by_ids(ids)?;

        Ok(result
            .into_iter()
            .map(|insurance_provider| (insurance_provider.id.clone(), insurance_provider))
            .collect())
    }
}
