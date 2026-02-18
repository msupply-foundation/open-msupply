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

impl Loader<ItemsStockOnHandLoaderInput> for ItemsStockOnHandLoader {
    type Value = u32;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        store_and_item_id: &[ItemsStockOnHandLoaderInput],
    ) -> Result<HashMap<ItemsStockOnHandLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let item_ids =
            super::unique_ids(store_and_item_id.iter().map(|input| input.item_id.clone()));
        let store_ids =
            super::unique_ids(store_and_item_id.iter().map(|input| input.store_id.clone()));

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
                    stock_on_hand.available_stock_on_hand as u32,
                )
            })
            .collect())
    }
}
