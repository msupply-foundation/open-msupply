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
        store_id: &str,
        program_id: &str,
        payload: RequisitionIndicatorInfoLoaderInputPayload,
    ) -> Self {
        RequisitionIndicatorInfoLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: program_id.to_string(),
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

        let (store_id, program_id, period_id) = if let Some(loader_input) = loader_inputs.first() {
            (
                loader_input.primary_id.clone(),
                loader_input.secondary_id.clone(),
                loader_input.payload.clone(),
            )
        } else {
            return Ok(HashMap::new());
        };

        let mut result = HashMap::new();

        let indicator_info = self
            .service_provider
            .requisition_service
            .get_indicator_information(&service_context, &store_id, &period_id, &program_id)?;

        for loader_input in loader_inputs {
            result.insert(loader_input.clone(), indicator_info.clone());
        }

        Ok(result)
    }
}
