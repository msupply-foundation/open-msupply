use repository::EqualFilter;
use repository::{
    temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct TemperatureBreachByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for TemperatureBreachByIdLoader {
    type Value = TemperatureBreach;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = TemperatureBreachRepository::new(&connection);

        let result = repo.query_by_filter(
            TemperatureBreachFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|temperature_breach| {
                (
                    temperature_breach.temperature_breach_row.id.clone(),
                    temperature_breach,
                )
            })
            .collect())
    }
}
