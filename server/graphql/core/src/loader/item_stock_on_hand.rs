use super::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, StockOnHandFilter, StockOnHandRepository};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemsStockOnHandLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone)]
pub struct EmptyPayload;
pub type ItemsStockOnHandLoaderInput = IdPair<EmptyPayload>;
impl ItemsStockOnHandLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ItemsStockOnHandLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}

#[async_trait::async_trait]
impl Loader<ItemsStockOnHandLoaderInput> for ItemsStockOnHandLoader {
    type Value = u32;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        store_and_item_id: &[ItemsStockOnHandLoaderInput],
    ) -> Result<HashMap<ItemsStockOnHandLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (store_ids, item_ids) = IdPair::extract_unique_ids(store_and_item_id);

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
