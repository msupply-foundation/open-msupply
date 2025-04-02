use repository::{EqualFilter, ItemWarningLink, ItemWarningLinkFilter, ItemWarningLinkRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct WarningLoader {
    pub connection_manager: StorageConnectionManager,
}
// needs to get warning links
impl Loader<String> for WarningLoader {
    type Value = Vec<ItemWarningLink>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ItemWarningLinkRepository::new(&connection);

        let warnings = repo.query_by_filter(
            ItemWarningLinkFilter::new().item_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<ItemWarningLink>> = HashMap::new();

        for warning in warnings {
            let id = warning.warning_row.id.clone();
            let list = map.entry(id).or_default();
            list.push(warning);
        }

        Ok(map)
    }
}
