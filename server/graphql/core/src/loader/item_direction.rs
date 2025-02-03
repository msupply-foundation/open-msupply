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
        let service_context = self.service_provider.basic_context()?;
        let repo = ItemDirectionRepository::new(&service_context.connection);

        let item_directions = repo.query_by_filter(
            ItemDirectionFilter::new().item_id(EqualFilter::equal_any(item_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<ItemDirection>> = HashMap::new();
        for direction in item_directions {
            let list = map.entry(direction.item_row.id.clone()).or_default();
            list.push(direction);
        }

        Ok(map)
    }
}

pub struct ItemDirectionByItemDirectionIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ItemDirectionByItemDirectionIdLoader {
    type Value = ItemDirection;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_direction_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = ItemDirectionRepository::new(&service_context.connection);

        let item_directions = repo.query_by_filter(
            ItemDirectionFilter::new().id(EqualFilter::equal_any(item_direction_ids.to_vec())),
        )?;

        let mut map: HashMap<String, ItemDirection> = HashMap::new();
        for direction in item_directions {
            map.insert(direction.item_row.id.clone(), direction);
        }
        Ok(map)
    }
}
