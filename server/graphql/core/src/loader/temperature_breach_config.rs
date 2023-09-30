use repository::EqualFilter;
use repository::{
    temperature_breach_config::{
        TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigRepository,
    },
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct TemperatureBreachConfigByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for TemperatureBreachConfigByIdLoader {
    type Value = TemperatureBreachConfig;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = TemperatureBreachConfigRepository::new(&connection);

        let result = repo.query_by_filter(
            TemperatureBreachConfigFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|temperature_breach_config| {
                (
                    temperature_breach_config
                        .temperature_breach_config_row
                        .id
                        .clone(),
                    temperature_breach_config,
                )
            })
            .collect())
    }
}
