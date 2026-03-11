use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::{loader::LocationByIdLoader, ContextExt};
use repository::item_store_join::ItemStoreJoinRow;

use super::LocationNode;

#[derive(PartialEq, Debug)]
pub struct ItemStorePropertiesNode {
    item_store_properties: ItemStoreJoinRow,
}

#[Object]
impl ItemStorePropertiesNode {
    pub async fn id(&self) -> &str {
        &self.item_store_properties.id
    }

    pub async fn default_sell_price_per_pack(&self) -> f64 {
        self.item_store_properties.default_sell_price_per_pack
    }

    pub async fn ignore_for_orders(&self) -> bool {
        self.item_store_properties.ignore_for_orders
    }

    pub async fn margin(&self) -> f64 {
        self.item_store_properties.margin
    }

    pub async fn default_location_id(&self) -> &Option<String> {
        &self.item_store_properties.default_location_id
    }

    pub async fn default_location(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<LocationNode>> {
        let location_id = match &self.item_store_properties.default_location_id {
            Some(id) => id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();
        Ok(loader
            .load_one(location_id.clone())
            .await?
            .map(LocationNode::from_domain))
    }
}

impl ItemStorePropertiesNode {
    pub fn from_domain(item_store_join: ItemStoreJoinRow) -> ItemStorePropertiesNode {
        ItemStorePropertiesNode {
            item_store_properties: item_store_join,
        }
    }
}
