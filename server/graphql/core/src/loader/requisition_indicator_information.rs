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

        let line_ids = util::dedup_iter(loader_inputs.iter().map(|input| input.line_id.clone()));

        let Some(RequisitionIndicatorInfoLoaderInput {
            store_id,
            period_id,
            ..
        }) = loader_inputs.first()
        else {
            return Ok(HashMap::new());
        };

        let indicator_info_rows = self
            .service_provider
            .requisition_service
            .get_indicator_information(&service_context, line_ids, store_id, period_id)?;

        let mut result: HashMap<_, Self::Value> = HashMap::new();

        for indicator_info in indicator_info_rows {
            result
                .entry(RequisitionIndicatorInfoLoaderInput::new(
                    &indicator_info.indicator_line_id,
                    store_id,
                    period_id,
                ))
                .or_default()
                .push(indicator_info);
        }

        Ok(result)
    }
}
