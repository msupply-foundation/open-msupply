use super::IdPair;
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

pub type RequisitionIndicatorInfoLoaderInputPayload = String;
pub type RequisitionIndicatorInfoLoaderInput = IdPair<RequisitionIndicatorInfoLoaderInputPayload>;
impl RequisitionIndicatorInfoLoaderInput {
    pub fn new(
        line_id: &str,
        store_id: &str,
        payload: RequisitionIndicatorInfoLoaderInputPayload,
    ) -> Self {
        RequisitionIndicatorInfoLoaderInput {
            primary_id: line_id.to_string(),
            secondary_id: store_id.to_string(),
            payload,
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

        let (line_ids, _) = IdPair::extract_unique_ids(loader_inputs);

        let Some(IdPair {
            secondary_id: store_id,
            payload: period_id,
            ..
        }) = loader_inputs.first()
        else {
            return Ok(HashMap::new());
        };

        let indicator_info_rows = self
            .service_provider
            .requisition_service
            .get_indicator_information(&service_context, line_ids, &store_id, &period_id)?;

        let mut result: HashMap<_, Self::Value> = HashMap::new();

        for indicator_info in indicator_info_rows {
            result
                .entry(RequisitionIndicatorInfoLoaderInput::new(
                    &indicator_info.indicator_line_id,
                    store_id,
                    period_id.to_string(),
                ))
                .or_default()
                .push(indicator_info);
        }

        Ok(result)
    }
}
