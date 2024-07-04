use actix_web::web::Data;
use repository::{NameRow, NameRowRepository, RepositoryError};

use async_graphql::dataloader::*;
use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct NameRowLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for NameRowLoader {
    type Value = NameRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let results = NameRowRepository::new(&service_context.connection).find_many_by_id(keys)?;

        Ok(results
            .into_iter()
            .map(|name_row| (name_row.id.clone(), name_row))
            .collect())
    }
}
