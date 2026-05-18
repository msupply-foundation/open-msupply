use repository::{EqualFilter, ShippingMethod, ShippingMethodFilter, ShippingMethodRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ShippingMethodByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ShippingMethodByIdLoader {
    type Value = ShippingMethod;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let keys = keys.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, ShippingMethod>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = ShippingMethodRepository::new(&connection);
                let result = repo
                    .query(Some(ShippingMethodFilter {
                        id: Some(EqualFilter::equal_any(keys)),
                        ..Default::default()
                    }))?
                    .into_iter()
                    .map(|c| {
                        let id = c.id.clone();
                        (id, c)
                    })
                    .collect();
                Ok(result)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
