use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, RepositoryError};
use service::service_provider::{ServiceContext, ServiceProvider};
use std::collections::HashMap;

use super::IdPair;

#[derive(Clone)]
pub struct IndicatorValuePayload {
    pub period_id: String,
    pub supplier_store_id: String,
    pub customer_name_id: String,
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
    type Value = ProgramIndicatorValue;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[IndicatorValueLoaderInput],
    ) -> Result<HashMap<IndicatorValueLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (period_id, supplier_store_id, customer_name_id) =
            // TODO replace with logic to not assume only one combination queried at any time.
            if let Some(loader_input) = loader_inputs.first() {
                (
                    loader_input.payload.period_id.clone(),
                    loader_input.payload.supplier_store_id.clone(),
                    loader_input.payload.customer_name_id.clone(),
                )
            } else {
                return Ok(HashMap::new());
            };

        let filter = IndicatorValueFilter::new();

        let values = get_program_indicator_values(&service_context, filter).unwrap();

        let payload = IndicatorValuePayload {
            period_id,
            supplier_store_id,
            customer_name_id,
        };

        Ok(values
            .into_iter()
            .map(|value| {
                (
                    IndicatorValueLoaderInput::new(
                        &value.line_id,
                        &value.column_id,
                        payload.clone(),
                    ),
                    value,
                )
            })
            .collect())
    }
}

// below are mock values which will be replaced by service layer functions later
#[derive(Clone)]

pub struct ProgramIndicatorValue {
    pub id: String,
    pub line_id: String,
    pub column_id: String,
    pub period_id: String,
    pub store_id: String,
    pub facility_id: String,
    pub value: String,
}

pub struct IndicatorValueFilter {
    pub supplier_store_id: Option<EqualFilter<String>>,
    pub period_id: Option<EqualFilter<String>>,
    pub customer_name_id: Option<EqualFilter<String>>,
}

impl IndicatorValueFilter {
    pub fn new() -> IndicatorValueFilter {
        IndicatorValueFilter {
            supplier_store_id: None,
            period_id: None,
            customer_name_id: None,
        }
    }

    // Will also impl other filters later in actual PR
}

pub fn get_program_indicator_values(
    _ctx: &ServiceContext,
    _filter: IndicatorValueFilter,
) -> Result<Vec<ProgramIndicatorValue>, RepositoryError> {
    let mut result = Vec::new();
    let dummy_indicator = ProgramIndicatorValue {
        id: "some_id".to_string(),
        line_id: "some_id".to_string(),
        column_id: "some_id".to_string(),
        period_id: "some_id".to_string(),
        store_id: "some_id".to_string(),
        facility_id: "some_id".to_string(),
        value: "some_value".to_string(),
    };
    result.push(dummy_indicator);
    Ok(result)
}
