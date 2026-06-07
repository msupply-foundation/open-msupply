use actix_web::web::Data;
use async_graphql::dataloader::*;
use service::{
    requisition::request_requisition::CustomerIndicatorInformation,
    service_provider::ServiceProvider,
};
use std::collections::HashMap;

pub struct RequisitionIndicatorInfoLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct RequisitionIndicatorInfoLoaderInput {
    pub line_id: String,
    pub store_id: String,
    pub period_id: String,
}
impl RequisitionIndicatorInfoLoaderInput {
    pub fn new(line_id: &str, store_id: &str, period_id: &str) -> Self {
        RequisitionIndicatorInfoLoaderInput {
            line_id: line_id.to_string(),
            store_id: store_id.to_string(),
            period_id: period_id.to_string(),
        }
    }
}

impl Loader<RequisitionIndicatorInfoLoaderInput> for RequisitionIndicatorInfoLoader {
    type Value = Vec<CustomerIndicatorInformation>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[RequisitionIndicatorInfoLoaderInput],
    ) -> Result<HashMap<RequisitionIndicatorInfoLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // The loader registry is shared across all requests, so a single batch can mix
        // inputs from different (store, period) combinations. Group line_ids by
        // (store_id, period_id) and query each group separately rather than assuming a
        // single store/period for the whole batch.
        let mut group_line_map = HashMap::<(String, String), Vec<String>>::new();
        for input in loader_inputs {
            group_line_map
                .entry((input.store_id.clone(), input.period_id.clone()))
                .or_default()
                .push(input.line_id.clone());
        }

        let mut result: HashMap<_, Self::Value> = HashMap::new();

        for ((store_id, period_id), line_ids) in group_line_map {
            let line_ids = util::dedup_iter(line_ids);

            let indicator_info_rows = self
                .service_provider
                .requisition_service
                .get_indicator_information(&service_context, line_ids, &store_id, &period_id)?;

            for indicator_info in indicator_info_rows {
                result
                    .entry(RequisitionIndicatorInfoLoaderInput::new(
                        &indicator_info.indicator_line_id,
                        &store_id,
                        &period_id,
                    ))
                    .or_default()
                    .push(indicator_info);
            }
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{
            mock_name_store_b, mock_period, mock_period_2_a, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db, NameRow, StorePreferenceRow,
    };

    // The loader registry is shared across requests, so a single batch can contain inputs
    // for multiple (store, period) combinations. Verify each input resolves to its OWN
    // period rather than all being looked up against the first period in the batch.
    #[tokio::test]
    async fn requisition_indicator_info_loader_batches_across_periods() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "requisition_indicator_info_loader_batches_across_periods",
            MockDataInserts::all(),
            MockData {
                // store_b is already a customer of store_a (mock_name_store_join), but the
                // customer query also requires its name to be supplied by store_a.
                names: vec![NameRow {
                    supplying_store_id: Some(mock_store_a().id),
                    ..mock_name_store_b()
                }],
                // Indicator info is only returned when extra fields are enabled for the store.
                store_preferences: vec![StorePreferenceRow {
                    id: mock_store_a().id,
                    extra_fields_in_requisition: true,
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let loader = RequisitionIndicatorInfoLoader {
            service_provider: Data::new(ServiceProvider::new(connection_manager)),
        };

        let line_id = "test_indicator_line";
        // Same store + line, two different periods, in a single batch.
        let period_1_input =
            RequisitionIndicatorInfoLoaderInput::new(line_id, &mock_store_a().id, &mock_period().id);
        let period_2_input = RequisitionIndicatorInfoLoaderInput::new(
            line_id,
            &mock_store_a().id,
            &mock_period_2_a().id,
        );

        let result = loader
            .load(&[period_1_input.clone(), period_2_input.clone()])
            .await
            .unwrap();

        // Each period's input resolves to its OWN period's data. Previously period 2's input
        // was absent (the batch queried only the first period and keyed everything under it).
        let period_1_info = result.get(&period_1_input).unwrap();
        let period_2_info = result.get(&period_2_input).unwrap();
        assert!(period_1_info
            .iter()
            .all(|info| info.datetime.date() == mock_period().end_date));
        assert!(period_2_info
            .iter()
            .all(|info| info.datetime.date() == mock_period_2_a().end_date));
    }
}
