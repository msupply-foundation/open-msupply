use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use async_graphql::*;
use repository::LocationTypeRow;
use service::{
    requisition_line::response_requisition_line::get_requisition_available_volume_for_items,
    service_provider::ServiceProvider,
};
use std::collections::HashMap;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct AvailableVolumeOnRequisitionLoaderInput {
    requisition_id: String,
    item_id: String,
}
impl AvailableVolumeOnRequisitionLoaderInput {
    pub fn new(requisition_id: &str, item_id: &str) -> Self {
        AvailableVolumeOnRequisitionLoaderInput {
            requisition_id: requisition_id.to_string(),
            item_id: item_id.to_string(),
        }
    }
}
pub struct AvailableVolumeOnRequisitionLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<AvailableVolumeOnRequisitionLoaderInput> for AvailableVolumeOnRequisitionLoader {
    type Value = (Option<LocationTypeRow>, f64, f64); // (LocationTypeRow, available_volume, item_volume_per_unit)
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_ids: &[AvailableVolumeOnRequisitionLoaderInput],
    ) -> Result<HashMap<AvailableVolumeOnRequisitionLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let connection = &service_context.connection;

        // The loader registry is shared across all requests, so a single batch can mix
        // inputs from different requisitions. Group item_ids by requisition_id and query
        // each requisition separately rather than assuming a single one for the whole batch.
        let mut requisition_item_map = HashMap::<String, Vec<String>>::new();
        for input in requisition_and_item_ids {
            requisition_item_map
                .entry(input.requisition_id.clone())
                .or_default()
                .push(input.item_id.clone());
        }

        let mut output = HashMap::<
            AvailableVolumeOnRequisitionLoaderInput,
            (Option<LocationTypeRow>, f64, f64),
        >::new();

        for (requisition_id, item_ids) in requisition_item_map {
            let available_volumes =
                get_requisition_available_volume_for_items(connection, &requisition_id, &item_ids)?;

            for item_id in &item_ids {
                if let Some(volume_info) = available_volumes.get(item_id) {
                    output.insert(
                        AvailableVolumeOnRequisitionLoaderInput::new(&requisition_id, item_id),
                        (
                            volume_info.location_type.clone(),
                            volume_info.available_volume,
                            volume_info.volume_per_unit,
                        ),
                    );
                } else {
                    output.insert(
                        AvailableVolumeOnRequisitionLoaderInput::new(&requisition_id, item_id),
                        (None, 0.0, 0.0),
                    );
                }
            }
        }

        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{mock_name_a, mock_store_a, MockData, MockDataInserts},
        test_db, ItemRow, RequisitionLineRow, RequisitionRow,
    };

    fn test_item(id: &str) -> ItemRow {
        ItemRow {
            id: id.to_string(),
            name: id.to_string(),
            code: id.to_string(),
            // pack_size of 1 keeps volume_per_unit math clean (no division by zero)
            default_pack_size: 1.0,
            ..Default::default()
        }
    }

    fn test_requisition(id: &str, number: i64) -> RequisitionRow {
        RequisitionRow {
            id: id.to_string(),
            requisition_number: number,
            name_link_id: mock_name_a().id,
            store_id: mock_store_a().id,
            ..Default::default()
        }
    }

    fn test_line(id: &str, requisition_id: &str, item_id: &str, available_volume: f64) -> RequisitionLineRow {
        RequisitionLineRow {
            id: id.to_string(),
            requisition_id: requisition_id.to_string(),
            item_link_id: item_id.to_string(),
            available_volume: Some(available_volume),
            ..Default::default()
        }
    }

    // The loader registry is shared across requests, so a single batch can contain inputs
    // for multiple requisitions. Verify each (requisition, item) input resolves to its OWN
    // requisition's available volume rather than all being looked up against the first one.
    #[tokio::test]
    async fn available_volume_loader_batches_across_requisitions() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "available_volume_loader_batches_across_requisitions",
            MockDataInserts::all(),
            MockData {
                items: vec![test_item("avail_item_x"), test_item("avail_item_y")],
                requisitions: vec![
                    test_requisition("avail_req_1", 700001),
                    test_requisition("avail_req_2", 700002),
                ],
                requisition_lines: vec![
                    test_line("avail_line_1", "avail_req_1", "avail_item_x", 100.0),
                    test_line("avail_line_2", "avail_req_2", "avail_item_y", 50.0),
                ],
                ..Default::default()
            },
        )
        .await;

        let loader = AvailableVolumeOnRequisitionLoader {
            service_provider: Data::new(ServiceProvider::new(connection_manager)),
        };

        let req1_input = AvailableVolumeOnRequisitionLoaderInput::new("avail_req_1", "avail_item_x");
        let req2_input = AvailableVolumeOnRequisitionLoaderInput::new("avail_req_2", "avail_item_y");

        let result = loader
            .load(&[req1_input.clone(), req2_input.clone()])
            .await
            .unwrap();

        // req2's input resolves to req2's own volume (previously absent: the batch used
        // req1 as the only requisition and looked up item_y within req1).
        assert_eq!(result.get(&req1_input).unwrap().1, 100.0);
        assert_eq!(result.get(&req2_input).unwrap().1, 50.0);
    }
}
