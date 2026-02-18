use crate::standard_graphql_error::StandardGraphqlError;

use super::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use chrono::NaiveDate;
use ordered_float::OrderedFloat;
use service::{item_stats::ItemStats, service_provider::ServiceProvider};
use std::collections::HashMap;

pub struct ItemsStatsForItemLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct ItemStatsLoaderInputPayload {
    pub amc_lookback_months: Option<OrderedFloat<f64>>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Clone, PartialEq, Eq, Hash)]
// Newtype wrapper to provide custom Hash/Eq that includes payload
pub struct ItemStatsLoaderInput(IdPair<ItemStatsLoaderInputPayload>);

impl ItemStatsLoaderInput {
    pub fn new(
        store_id: &str,
        item_id: &str,
        amc_lookback_months: Option<f64>,
        period_end: Option<chrono::NaiveDate>,
    ) -> Self {
        ItemStatsLoaderInput(IdPair {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: ItemStatsLoaderInputPayload {
                amc_lookback_months: amc_lookback_months.map(OrderedFloat),
                period_end,
            },
        })
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

        // Validate all same store
        let store_id = match loader_inputs.first() {
            Some(input) => &input.0.primary_id,
            None => return Ok(HashMap::new()),
        };
        if loader_inputs.iter().any(|i| &i.0.primary_id != store_id) {
            return Err(StandardGraphqlError::BadUserInput(
                "Cannot batch item stats across multiple stores".to_string(),
            )
            .into());
        }
        let store_id = store_id.clone();

        let mut map = HashMap::<ItemStatsLoaderInputPayload, Vec<String>>::new();

        // Group by payload -> Vec<item_id>
        for input in loader_inputs {
            map.entry(input.0.payload.clone())
                .or_default()
                .push(input.0.secondary_id.clone());
        }

        let mut out = HashMap::<ItemStatsLoaderInput, Self::Value>::new();

        for (payload, item_ids) in map {
            let item_stats = self
                .service_provider
                .item_stats_service
                .get_item_stats(
                    &service_context,
                    &store_id,
                    payload.amc_lookback_months.map(|v| v.into_inner()),
                    item_ids,
                    payload.period_end,
                )
                .map_err(|e| StandardGraphqlError::from_error(&e))?;

            for item_stat in item_stats {
                out.insert(
                    ItemStatsLoaderInput::new(
                        &store_id,
                        &item_stat.item_id,
                        payload.amc_lookback_months.map(|v| v.into_inner()),
                        payload.period_end,
                    ),
                    item_stat,
                );
            }
        }
        Ok(out)
    }
}
