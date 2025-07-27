use async_graphql::*;
use repository::item_store_join::ItemStoreJoinRow;

#[derive(PartialEq, Debug)]
pub struct ItemStoreJoinNode {
    item_store_join: ItemStoreJoinRow,
}

#[Object]
impl ItemStoreJoinNode {
    pub async fn id(&self) -> &str {
        &self.item_store_join.id
    }

    pub async fn default_sell_price_per_pack(&self) -> f64 {
        self.item_store_join.default_sell_price_per_pack
    }
}

impl ItemStoreJoinNode {
    pub fn from_domain(item_store_join: ItemStoreJoinRow) -> ItemStoreJoinNode {
        ItemStoreJoinNode { item_store_join }
    }
}
