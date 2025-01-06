use super::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use service::{
    requisition::request_requisition::RequisitionItemInformation, service_provider::ServiceProvider,
};
use std::collections::HashMap;

pub struct RequisitionItemInfoLoader {
    pub service_provider: Data<ServiceProvider>,
}

pub type RequisitionItemInfoLoaderInputPayload = (String, Option<String>, String); // program_id, elmis_code, period_id
pub type RequisitionItemInfoLoaderInput = IdPair<RequisitionItemInfoLoaderInputPayload>;
impl RequisitionItemInfoLoaderInput {
    pub fn new(
        store_id: &str,
        item_id: &str,
        payload: RequisitionItemInfoLoaderInputPayload,
    ) -> Self {
        RequisitionItemInfoLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload,
        }
    }
}

impl Loader<RequisitionItemInfoLoaderInput> for RequisitionItemInfoLoader {
    type Value = Vec<RequisitionItemInformation>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        loader_inputs: &[RequisitionItemInfoLoaderInput],
    ) -> Result<HashMap<RequisitionItemInfoLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let (store_id, (program_id, elmis_code, period_id)) =
            if let Some(loader_input) = loader_inputs.first() {
                (
                    loader_input.primary_id.clone(),
                    loader_input.payload.clone(),
                )
            } else {
                return Ok(HashMap::new());
            };

        let item_ids = IdPair::get_all_secondary_ids(loader_inputs);

        let mut result = HashMap::new();

        for item_ids in item_ids {
            let item_info = self
                .service_provider
                .requisition_service
                .get_requisition_item_information(
                    &service_context,
                    &store_id,
                    &program_id,
                    elmis_code.clone(),
                    &period_id,
                    &item_ids,
                )?;

            result.insert(
                RequisitionItemInfoLoaderInput::new(
                    &store_id,
                    &item_ids,
                    (program_id.clone(), elmis_code.clone(), period_id.clone()),
                ),
                item_info,
            );
        }

        Ok(result)
    }
}
