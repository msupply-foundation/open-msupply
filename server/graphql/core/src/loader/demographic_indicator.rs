use repository::DemographicIndicatorRow;
use repository::EqualFilter;
use repository::{DemographicIndicatorFilter, DemographicIndicatorRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct DemographicIndicatorLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for DemographicIndicatorLoader {
    type Value = DemographicIndicatorRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = DemographicIndicatorRepository::new(&connection);

        let result = repo.query_by_filter(
            DemographicIndicatorFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|demographic| (demographic.id.clone(), demographic))
            .collect())
    }
}
