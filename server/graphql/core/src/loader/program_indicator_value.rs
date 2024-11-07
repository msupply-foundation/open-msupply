use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow,
};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use super::IdPair;

#[derive(Clone)]
pub struct IndicatorValuePayload {
    pub period_id: String,
    pub supplier_store_id: String,
    pub customer_name_link_id: String,
}

pub type IndicatorValueLoaderInput = IdPair<IndicatorValuePayload>;
impl IndicatorValueLoaderInput {
    pub fn new(line_id: &str, column_id: &str, extra_filter: IndicatorValuePayload) -> Self {
        IndicatorValueLoaderInput {
            primary_id: line_id.to_string(),
            secondary_id: column_id.to_string(),
            // later add store and period and facility ids to this payload
            payload: extra_filter,
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

        let (period_id, supplier_store_id, customer_name_link_id) =
            // TODO replace with logic to not assume only one combination queried at any time.
            if let Some(loader_input) = loader_inputs.first() {
                (
                    loader_input.payload.period_id.clone(),
                    loader_input.payload.supplier_store_id.clone(),
                    loader_input.payload.customer_name_link_id.clone(),
                )
            } else {
                return Ok(HashMap::new());
            };

        let filter = IndicatorValueFilter::new()
            .supplier_store_id(EqualFilter::equal_to(&supplier_store_id))
            .customer_name_link_id(EqualFilter::equal_to(&customer_name_link_id))
            .period_id(EqualFilter::equal_to(&period_id));

        let values =
            IndicatorValueRepository::new(&service_context.connection).query_by_filter(filter)?;

        let payload = IndicatorValuePayload {
            period_id,
            supplier_store_id,
            customer_name_link_id,
        };

        Ok(values
            .into_iter()
            .map(|value| {
                (
                    IndicatorValueLoaderInput::new(
                        &value.indicator_line_id,
                        &value.indicator_column_id,
                        payload.clone(),
                    ),
                    value,
                )
            })
            .collect())
    }
}
