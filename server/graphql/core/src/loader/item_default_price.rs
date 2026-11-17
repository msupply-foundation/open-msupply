use repository::{RepositoryError, StorageConnectionManager};
use service::pricing::item_price::get_default_prices_for_items;

use async_graphql::dataloader::*;
use std::collections::HashMap;

/// Each item's default price list price per unit, by item id: the price the
/// server charges a patient for each unit of a stock-out line. An item on no
/// default price list, or whose line has no price, has no entry.
pub struct ItemDefaultPriceLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ItemDefaultPriceLoader {
    type Value = f64;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;

        Ok(get_default_prices_for_items(&connection, item_ids)?
            .into_iter()
            .filter_map(|(item_id, price)| price.map(|price| (item_id, price)))
            .collect())
    }
}
