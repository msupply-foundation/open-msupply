use crate::{loader::IdPair, standard_graphql_error::StandardGraphqlError};
use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use repository::{EqualFilter, MasterListLineFilter, MasterListLineRepository};
use service::{
    requisition::program_settings::supplier_program_settings::{
        get_program_settings_and_order_types_for_store, ProgramAndOrderType,
        ProgramSettingsAndOrderTypes,
    },
    service_provider::ServiceProvider,
};
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct EmptyPayload;
pub type OrderTypesByProgramIdInput = IdPair<EmptyPayload>;
impl OrderTypesByProgramIdInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        OrderTypesByProgramIdInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}

pub struct OrderTypesByProgramIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<OrderTypesByProgramIdInput> for OrderTypesByProgramIdLoader {
    type Value = Vec<ProgramAndOrderType>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[OrderTypesByProgramIdInput],
    ) -> Result<HashMap<OrderTypesByProgramIdInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let connection = self.service_provider.connection_manager.connection()?;

        let mut store_item_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_item_map.entry(item.primary_id.clone()).or_default();
            entry.push(item.secondary_id.clone())
        }

        let store_ids = store_item_map.keys().cloned().collect::<Vec<String>>();

        let ProgramSettingsAndOrderTypes {
            settings,
            order_types,
        } = match get_program_settings_and_order_types_for_store(&service_context, &store_ids[0])? {
            None => return Ok(HashMap::new()),
            Some(data) => data,
        };

        let program_ids = settings
            .iter()
            .map(|s| s.program_settings_row.program_id.clone())
            .collect::<Vec<String>>();

        let master_list_lines = MasterListLineRepository::new(&connection)
            .query_by_filter(
                MasterListLineFilter::new()
                    .master_list_id(EqualFilter::equal_any(program_ids.clone())),
            )
            .map_err(StandardGraphqlError::from_repository_error)?;

        let mut program_ids_order_types: HashMap<String, Vec<ProgramAndOrderType>> = HashMap::new();
        let mut result = HashMap::<OrderTypesByProgramIdInput, Vec<ProgramAndOrderType>>::new();
        for order_type in order_types {
            if let Some(setting) = settings
                .iter()
                .find(|s| s.program_settings_row.id == order_type.program_requisition_settings_id)
            {
                program_ids_order_types
                    .entry(setting.program_settings_row.program_id.clone())
                    .or_default()
                    .push(ProgramAndOrderType {
                        program: setting.program_row.clone(),
                        order_type: order_type.clone(),
                    });
            }
        }

        for (store_id, item_ids) in store_item_map {
            for item_id in item_ids {
                let program_ids_for_item = master_list_lines
                    .iter()
                    .filter(|line| line.item_id == item_id)
                    .map(|line| line.master_list_id.clone())
                    .collect::<Vec<String>>();
                let mut order_types_for_item = vec![];
                for program_id in &program_ids_for_item {
                    if let Some(mut p) = program_ids_order_types.get(program_id).cloned() {
                        order_types_for_item.append(&mut p);
                    }
                }
                let key = OrderTypesByProgramIdInput::new(&store_id, &item_id);
                result.insert(key, order_types_for_item);
            }
        }

        Ok(result)
    }
}
