use repository::{EqualFilter, ItemWarning, ItemWarningJoinFilter, ItemWarningJoinRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct WarningLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for WarningLoader {
    type Value = Vec<ItemWarning>;
    type Error = RepositoryError;
    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let item_ids = item_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<ItemWarning>>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = ItemWarningJoinRepository::new(&connection);

                let warnings = repo.query_by_filter(
                    ItemWarningJoinFilter::new()
                        .item_id(EqualFilter::equal_any(item_ids)),
                )?;

                let mut map: HashMap<String, Vec<ItemWarning>> = HashMap::new();

                for warning in warnings {
                    let id = warning.item_row.id.clone();
                    let list = map.entry(id).or_default();
                    list.push(warning);
                }

                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
