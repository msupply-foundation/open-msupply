use super::ItemStatsLoaderInput;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::EqualFilter;
use repository::{ItemStats, ItemStatsFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemsStatsForItemLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<ItemStatsLoaderInput> for ItemsStatsForItemLoader {
    type Value = ItemStats;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[ItemStatsLoaderInput],
    ) -> Result<HashMap<ItemStatsLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.context()?;

        let (store_id, look_back_datetime) = if let Some(loader_input) = loader_inputs.first() {
            (
                loader_input.store_id.clone(),
                loader_input.look_back_datetime.clone(),
            )
        } else {
            return Ok(HashMap::new());
        };

        let filter = ItemStatsFilter::new().item_id(EqualFilter::equal_any(
            loader_inputs
                .iter()
                .map(|loader_input| loader_input.item_id.clone())
                .collect(),
        ));

        let item_stats = self.service_provider.item_stats_service.get_item_stats(
            &service_context,
            &store_id,
            look_back_datetime.clone(),
            Some(filter),
        )?;

        Ok(item_stats
            .into_iter()
            .map(|item_stat| {
                (
                    ItemStatsLoaderInput {
                        item_id: item_stat.item_id.clone(),
                        store_id: store_id.clone(),
                        look_back_datetime,
                    },
                    item_stat,
                )
            })
            .collect())
    }
}
