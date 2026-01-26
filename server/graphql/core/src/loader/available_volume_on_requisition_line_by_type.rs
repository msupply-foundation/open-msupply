use crate::loader::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use async_graphql::*;
use repository::LocationTypeRow;
use service::{
    requisition_line::response_requisition_line::get_available_volume_for_items,
    service_provider::ServiceProvider,
};
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct EmptyPayload;
pub type AvailableVolumeOnRequisitionLineByTypeLoaderInput = IdPair<EmptyPayload>;
impl AvailableVolumeOnRequisitionLineByTypeLoaderInput {
    pub fn new(requisition_id: &str, item_id: &str) -> Self {
        AvailableVolumeOnRequisitionLineByTypeLoaderInput {
            primary_id: requisition_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct AvailableVolumeOnRequisitionLineByTypeLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<AvailableVolumeOnRequisitionLineByTypeLoaderInput>
    for AvailableVolumeOnRequisitionLineByTypeLoader
{
    type Value = (Option<LocationTypeRow>, f64, f64); // (LocationTypeRow, available_volume, item_volume_per_unit)
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_ids: &[AvailableVolumeOnRequisitionLineByTypeLoaderInput],
    ) -> Result<HashMap<AvailableVolumeOnRequisitionLineByTypeLoaderInput, Self::Value>, Self::Error>
    {
        let service_context = self.service_provider.basic_context()?;
        let connection = &service_context.connection;

        let requisition_id =
            if let Some(requisition_and_item_ids) = requisition_and_item_ids.first() {
                &requisition_and_item_ids.primary_id
            } else {
                return Ok(HashMap::new());
            };

        let item_ids: Vec<String> = requisition_and_item_ids
            .iter()
            .map(|input| input.secondary_id.clone())
            .collect();

        let available_volumes =
            get_available_volume_for_items(connection, requisition_id, &item_ids)?;

        let mut output = HashMap::<
            AvailableVolumeOnRequisitionLineByTypeLoaderInput,
            (Option<LocationTypeRow>, f64, f64),
        >::new();

        for input in requisition_and_item_ids.iter() {
            let item_id = &input.secondary_id;

            if let Some(volume_info) = available_volumes.get(item_id) {
                output.insert(
                    AvailableVolumeOnRequisitionLineByTypeLoaderInput::new(requisition_id, item_id),
                    (
                        volume_info.location_type.clone(),
                        volume_info.available_volume,
                        volume_info.volume_per_unit,
                    ),
                );
            } else {
                output.insert(
                    AvailableVolumeOnRequisitionLineByTypeLoaderInput::new(requisition_id, item_id),
                    (None, 0.0, 0.0),
                );
            }
        }

        Ok(output)
    }
}
