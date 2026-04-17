use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow,
};
use service::service_provider::ServiceProvider;
use std::collections::{HashMap, HashSet};

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
        let repo = IndicatorValueRepository::new(&service_context.connection);

        // Group inputs by (period_id, store_id, customer_name_id) to handle
        // batched requests with different filter combinations
        let mut groups: HashSet<(String, String, String)> = HashSet::new();
        for input in loader_inputs {
            groups.insert((
                input.period_id.clone(),
                input.store_id.clone(),
                input.customer_name_id.clone(),
            ));
        }

        let mut result = HashMap::new();

        for (period_id, store_id, customer_name_id) in &groups {
            let filter = IndicatorValueFilter::new()
                .store_id(EqualFilter::equal_to(store_id.clone()))
                .customer_name_id(EqualFilter::equal_to(customer_name_id.clone()))
                .period_id(EqualFilter::equal_to(period_id.clone()));

            let values = repo.query_by_filter(filter)?;

            for value in values {
                result.insert(
                    IndicatorValueLoaderInput::new(
                        &value.indicator_value_row.indicator_line_id,
                        &value.indicator_value_row.indicator_column_id,
                        period_id,
                        store_id,
                        customer_name_id,
                    ),
                    value.indicator_value_row,
                );
            }
        }

        Ok(result)
    }
}
