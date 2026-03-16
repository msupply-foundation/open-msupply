use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow,
};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct IndicatorValueLoaderInput {
    pub line_id: String,
    pub column_id: String,
    pub period_id: String,
    pub store_id: String,
    pub customer_name_id: String,
}
impl IndicatorValueLoaderInput {
    pub fn new(
        line_id: &str,
        column_id: &str,
        period_id: &str,
        store_id: &str,
        customer_name_id: &str,
    ) -> Self {
        IndicatorValueLoaderInput {
            line_id: line_id.to_string(),
            column_id: column_id.to_string(),
            // later add store and period and facility ids to this payload
            period_id: period_id.to_string(),
            store_id: store_id.to_string(),
            customer_name_id: customer_name_id.to_string(),
        }
    }
}

pub struct IndicatorValueLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<IndicatorValueLoaderInput> for IndicatorValueLoader {
    type Value = IndicatorValueRow;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[IndicatorValueLoaderInput],
    ) -> Result<HashMap<IndicatorValueLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (period_id, store_id, customer_name_id) =
            // TODO replace with logic to not assume only one combination queried at any time.
            if let Some(loader_input) = loader_inputs.first() {
                (
                    loader_input.period_id.clone(),
                    loader_input.store_id.clone(),
                    loader_input.customer_name_id.clone(),
                )
            } else {
                return Ok(HashMap::new());
            };
        if loader_inputs.len() > 1 {
            log::warn!(
                "IndicatorValueLoader received {} batched inputs but only supports one (period_id, store_id, customer_name_id) combination per batch. Only the first input will be used.",
                loader_inputs.len()
            );
        }

        let filter = IndicatorValueFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .customer_name_id(EqualFilter::equal_to(customer_name_id.to_string()))
            .period_id(EqualFilter::equal_to(period_id.to_string()));

        let values =
            IndicatorValueRepository::new(&service_context.connection).query_by_filter(filter)?;

        Ok(values
            .into_iter()
            .map(|value| {
                (
                    IndicatorValueLoaderInput::new(
                        &value.indicator_value_row.indicator_line_id,
                        &value.indicator_value_row.indicator_column_id,
                        &period_id,
                        &store_id,
                        &customer_name_id,
                    ),
                    value.indicator_value_row,
                )
            })
            .collect())
    }
}
