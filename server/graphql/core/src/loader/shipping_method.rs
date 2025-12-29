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
        let connection = self.connection_manager.connection()?;
        let repo = ShippingMethodRepository::new(&connection);
        let result = repo
            .query(Some(ShippingMethodFilter {
                id: Some(EqualFilter::equal_any(keys.to_vec())),
                ..Default::default()
            }))?
            .into_iter()
            .map(|c| {
                let id = c.id.clone();
                (id, c)
            })
            .collect();
        Ok(result)
    }
}
