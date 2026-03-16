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

        let period_ids =
            util::dedup_iter(loader_inputs.iter().map(|input| input.period_id.clone()));
        let store_ids =
            util::dedup_iter(loader_inputs.iter().map(|input| input.store_id.clone()));
        let customer_name_ids =
            util::dedup_iter(loader_inputs.iter().map(|input| input.customer_name_id.clone()));

        let filter = IndicatorValueFilter::new()
            .store_id(EqualFilter::equal_any(store_ids))
            .customer_name_id(EqualFilter::equal_any(customer_name_ids))
            .period_id(EqualFilter::equal_any(period_ids));

        let values =
            IndicatorValueRepository::new(&service_context.connection).query_by_filter(filter)?;

        Ok(values
            .into_iter()
            .map(|value| {
                (
                    IndicatorValueLoaderInput::new(
                        &value.indicator_value_row.indicator_line_id,
                        &value.indicator_value_row.indicator_column_id,
                        &value.indicator_value_row.period_id,
                        &value.indicator_value_row.store_id,
                        &value.indicator_value_row.customer_name_id,
                    ),
                    value.indicator_value_row,
                )
            })
            .collect())
    }
}
