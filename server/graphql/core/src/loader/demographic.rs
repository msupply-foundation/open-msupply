use repository::demographic::{DemographicFilter, DemographicRepository};
use repository::DemographicRow;
use repository::{EqualFilter, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct DemographicLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for DemographicLoader {
    type Value = DemographicRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = DemographicRepository::new(&connection);

        let result = repo
            .query_by_filter(DemographicFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|demographic| (demographic.id.clone(), demographic))
            .collect())
    }
}
