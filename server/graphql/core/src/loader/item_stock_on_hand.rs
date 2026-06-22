use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, StockOnHandFilter, StockOnHandRepository};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemsStockOnHandLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct ItemsStockOnHandLoaderInput {
    pub store_id: String,
    pub item_id: String,
}
impl ItemsStockOnHandLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ItemsStockOnHandLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
        }
    }
}

/// Both stock-on-hand figures from the (single batched) stock_on_hand view query.
/// `available` excludes held/reserved packs; `total` is all packs. Exposing both
/// lets `ItemNode.stockOnHand` be served from this loader instead of the much more
/// expensive item-stats path (which runs the AMC backend plugin).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ItemStockOnHand {
    pub available_stock_on_hand: u32,
    pub total_stock_on_hand: u32,
}

impl Loader<ItemsStockOnHandLoaderInput> for ItemsStockOnHandLoader {
    type Value = ItemStockOnHand;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        store_and_item_id: &[ItemsStockOnHandLoaderInput],
    ) -> Result<HashMap<ItemsStockOnHandLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let item_ids =
            util::dedup_iter(store_and_item_id.iter().map(|input| input.item_id.clone()));
        let store_ids =
            util::dedup_iter(store_and_item_id.iter().map(|input| input.store_id.clone()));

        let filter = StockOnHandFilter {
            item_id: Some(EqualFilter::equal_any(item_ids)),
            store_id: Some(EqualFilter::equal_any(store_ids)),
        };

        let stock_on_hand_rows =
            StockOnHandRepository::new(&service_context.connection).query(Some(filter))?;

        Ok(stock_on_hand_rows
            .into_iter()
            .map(|stock_on_hand| {
                (
                    ItemsStockOnHandLoaderInput::new(
                        &stock_on_hand.store_id,
                        &stock_on_hand.item_id,
                    ),
                    ItemStockOnHand {
                        available_stock_on_hand: stock_on_hand.available_stock_on_hand as u32,
                        total_stock_on_hand: stock_on_hand.total_stock_on_hand as u32,
                    },
                )
            })
            .collect())
    }
}
