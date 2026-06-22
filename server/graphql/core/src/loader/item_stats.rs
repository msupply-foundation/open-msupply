use crate::standard_graphql_error::StandardGraphqlError;

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
    // OrderedFloat is used to provide a total ordering for f64, which allows it to be used in Hash/Eq
    pub amc_lookback_months: Option<OrderedFloat<f64>>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct ItemStatsLoaderInput {
    pub store_id: String,
    pub item_id: String,
    pub payload: ItemStatsLoaderInputPayload,
}

impl ItemStatsLoaderInput {
    pub fn new(
        store_id: &str,
        item_id: &str,
        amc_lookback_months: Option<f64>,
        period_end: Option<chrono::NaiveDate>,
    ) -> Self {
        ItemStatsLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
            payload: ItemStatsLoaderInputPayload {
                amc_lookback_months: amc_lookback_months.map(OrderedFloat),
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
        // The loader registry is shared across all requests, so a single batch can mix
        // inputs from different stores. Group by (store_id, payload) and query each group
        // separately rather than assuming a single store/payload for the whole batch.
        let mut map = HashMap::<(String, ItemStatsLoaderInputPayload), Vec<String>>::new();

        for input in loader_inputs {
            map.entry((input.store_id.clone(), input.payload.clone()))
                .or_default()
                .push(input.item_id.clone());
        }

        let service_provider = self.service_provider.clone();

        // get_item_stats is synchronous and may invoke the average_monthly_consumption /
        // get_consumption plugins (the whole boajs interpreter, including any blocking http). Run
        // it on the blocking pool so it doesn't block the async runtime thread (#11949). The
        // ServiceContext is built inside the closure so nothing non-`Send` crosses the boundary.
        tokio::task::spawn_blocking(
            move || -> Result<HashMap<ItemStatsLoaderInput, ItemStats>, async_graphql::Error> {
                let service_context = service_provider.basic_context()?;
                let mut out = HashMap::<ItemStatsLoaderInput, ItemStats>::new();

                for ((store_id, payload), item_ids) in map {
                    let item_stats = service_provider
                        .item_stats_service
                        .get_item_stats(
                            &service_context,
                            &store_id,
                            payload.amc_lookback_months.map(|f| f.into_inner()),
                            item_ids,
                            payload.period_end,
                        )
                        .map_err(|e| StandardGraphqlError::from_error(&e))?;

                    for item_stat in item_stats {
                        out.insert(
                            ItemStatsLoaderInput::new(
                                &store_id,
                                &item_stat.item_id,
                                payload.amc_lookback_months.map(|f| f.into_inner()),
                                payload.period_end,
                            ),
                            item_stat,
                        );
                    }
                }
                Ok(out)
            },
        )
        .await
        .map_err(StandardGraphqlError::from_join_error)?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{mock_store_a, mock_store_b, test_item_stats, MockDataInserts},
        test_db,
    };

    // The loader registry is shared across requests, so a single batch can contain inputs
    // for multiple stores. Verify each (store, item) input resolves to its OWN store's
    // stats rather than erroring or cross-contaminating.
    #[tokio::test]
    async fn item_stats_loader_batches_across_stores() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "item_stats_loader_batches_across_stores",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
        )
        .await;

        let loader = ItemsStatsForItemLoader {
            service_provider: Data::new(ServiceProvider::new(connection_manager)),
        };

        let item_id = test_item_stats::item().id;
        // Same item, two different stores, in a single batch.
        let store_a_input = ItemStatsLoaderInput::new(&mock_store_a().id, &item_id, None, None);
        let store_b_input = ItemStatsLoaderInput::new(&mock_store_b().id, &item_id, None, None);

        let result = loader
            .load(&[store_a_input.clone(), store_b_input.clone()])
            .await
            .unwrap();

        // Both stores resolved (previously this errored with BadUserInput).
        assert_eq!(result.len(), 2);
        assert_eq!(
            result.get(&store_a_input).unwrap().available_stock_on_hand,
            test_item_stats::item_1_soh()
        );
        assert_eq!(
            result.get(&store_b_input).unwrap().available_stock_on_hand,
            test_item_stats::item_1_store_b_soh()
        );
    }
}
