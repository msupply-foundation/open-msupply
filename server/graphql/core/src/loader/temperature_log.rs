use repository::EqualFilter;
use repository::{
    temperature_log::{TemperatureLog, TemperatureLogFilter, TemperatureLogRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct TemperatureLogByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for TemperatureLogByIdLoader {
    type Value = TemperatureLog;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = TemperatureLogRepository::new(&connection);

        let result = repo.query_by_filter(
            TemperatureLogFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|temperature_log| {
                (
                    temperature_log.temperature_log_row.id.clone(),
                    temperature_log,
                )
            })
            .collect())
    }
}
