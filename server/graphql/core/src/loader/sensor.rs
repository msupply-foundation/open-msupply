use repository::EqualFilter;
use repository::{
    RepositoryError, Sensor, SensorFilter, SensorRepository, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct SensorByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for SensorByIdLoader {
    type Value = Sensor;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = SensorRepository::new(&connection);

        let result =
            repo.query_by_filter(SensorFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|sensor| (sensor.sensor_row.id.clone(), sensor))
            .collect())
    }
}
