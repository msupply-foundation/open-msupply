use actix_web::web::Data;
use repository::{
    item_direction::{ItemDirection, ItemDirectionFilter, ItemDirectionRepository},
    EqualFilter, RepositoryError,
};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemDirectionsByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ItemDirectionsByItemIdLoader {
    type Value = Vec<ItemDirection>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_provider = self.service_provider.clone();
        let item_ids = item_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<ItemDirection>>, RepositoryError> {
                let service_context = service_provider.basic_context()?;
                let repo = ItemDirectionRepository::new(&service_context.connection);

                let item_directions = repo.query_by_filter(
                    ItemDirectionFilter::new().item_id(EqualFilter::equal_any(item_ids)),
                )?;

                let mut map: HashMap<String, Vec<ItemDirection>> = HashMap::new();
                for direction in item_directions {
                    let list = map.entry(direction.item_row.id.clone()).or_default();
                    list.push(direction);
                }

                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
