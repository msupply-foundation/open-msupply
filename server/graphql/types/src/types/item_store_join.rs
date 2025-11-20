use async_graphql::*;
use repository::item_store_join::ItemStoreJoinRow;

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
}

impl ItemStorePropertiesNode {
    pub fn from_domain(item_store_join: ItemStoreJoinRow) -> ItemStorePropertiesNode {
        ItemStorePropertiesNode {
            item_store_properties: item_store_join,
        }
    }
}
