use crate::standard_graphql_error::StandardGraphqlError;

use super::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use chrono::NaiveDate;
use service::{item_stats::ItemStats, service_provider::ServiceProvider};
use std::collections::HashMap;

pub struct ItemsStatsForItemLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone, PartialEq)]
pub struct ItemStatsLoaderInputPayload {
    pub amc_lookback_months: Option<f64>,
    pub period_end: Option<NaiveDate>,
}

pub type ItemStatsLoaderInput = IdPair<ItemStatsLoaderInputPayload>;

impl ItemStatsLoaderInput {
    pub fn new(
        store_id: &str,
        item_id: &str,
        amc_lookback_months: Option<f64>,
        period_end: Option<chrono::NaiveDate>,
    ) -> Self {
        ItemStatsLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: ItemStatsLoaderInputPayload {
                amc_lookback_months,
                period_end,
            },
        }
    }
}

impl Loader<ItemStatsLoaderInput> for ItemsStatsForItemLoader {
    type Value = ItemStats;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[ItemStatsLoaderInput],
    ) -> Result<HashMap<ItemStatsLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (store_id, payload) = if let Some(loader_input) = loader_inputs.first() {
            (
                loader_input.primary_id.clone(),
                loader_input.payload.clone(),
            )
        } else {
            return Ok(HashMap::new());
        };

        let item_ids = IdPair::get_all_secondary_ids(loader_inputs);

        let item_stats = self
            .service_provider
            .item_stats_service
            .get_item_stats(
                &service_context,
                &store_id,
                payload.amc_lookback_months,
                item_ids,
                payload.period_end,
            )
            .map_err(|e| StandardGraphqlError::from_error(&e))?;

        Ok(item_stats
            .into_iter()
            .map(|item_stat| {
                (
                    ItemStatsLoaderInput::new(
                        &store_id,
                        &item_stat.item_id,
                        payload.amc_lookback_months,
                        payload.period_end,
                    ),
                    item_stat,
                )
            })
            .collect())
    }
}
