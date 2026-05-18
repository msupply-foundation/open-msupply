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
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, TemperatureLog>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = TemperatureLogRepository::new(&connection);

                let result = repo.query_by_filter(
                    TemperatureLogFilter::new().id(EqualFilter::equal_any(ids)),
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
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
