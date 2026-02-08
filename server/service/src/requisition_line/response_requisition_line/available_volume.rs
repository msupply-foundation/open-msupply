use repository::{
    EqualFilter, LocationTypeFilter, LocationTypeRepository, LocationTypeRow, RepositoryError,
    RequisitionLineFilter, RequisitionLineRepository, StorageConnection,
};
use std::collections::HashMap;

fn used_volume_on_lines_for_type(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<HashMap<String, f64>, RepositoryError> {
    let requisition_line_repo = RequisitionLineRepository::new(connection);

    let lines = requisition_line_repo.query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
    )?;

    let mut current_volume_on_lines = HashMap::<String, f64>::new();
    for line in lines.iter() {
        let location_type_id = match &line.requisition_line_row.location_type_id {
            Some(id) => id.clone(),
            None => continue,
        };

        let volume_per_unit = line.item_row.volume_per_pack / line.item_row.default_pack_size;
        let line_volume = volume_per_unit * line.requisition_line_row.supply_quantity;

        let entry = current_volume_on_lines
            .entry(location_type_id)
            .or_insert(0.0);
        *entry += line_volume;
    }

    Ok(current_volume_on_lines)
}

#[derive(Clone, Debug)]
pub struct AvailableVolumeInfo {
    pub location_type: Option<LocationTypeRow>,
    pub available_volume: f64,
    pub volume_per_unit: f64,
}

pub fn get_requisition_available_volume_for_items(
    connection: &StorageConnection,
    requisition_id: &str,
    item_ids: &[String],
) -> Result<HashMap<String, AvailableVolumeInfo>, RepositoryError> {
    let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
    )?;

    let used_volume_on_lines_for_type = used_volume_on_lines_for_type(connection, requisition_id)?;

    let location_type_ids: Vec<String> = used_volume_on_lines_for_type.keys().cloned().collect();
    let location_types = if !location_type_ids.is_empty() {
        LocationTypeRepository::new(connection).query_by_filter(
            LocationTypeFilter::new().id(EqualFilter::equal_any(location_type_ids)),
        )?
    } else {
        Vec::new()
    };

    let mut output = HashMap::<String, AvailableVolumeInfo>::new();

    for item_id in item_ids.iter() {
        let (location_type_id, current_item_volume, initial_available_volume, volume_per_unit) =
            if let Some(line) = requisition_lines
                .iter()
                .find(|line| &line.item_row.id == item_id)
            {
                let volume_per_unit =
                    line.item_row.volume_per_pack / line.item_row.default_pack_size;
                let current_item_volume =
                    volume_per_unit * line.requisition_line_row.supply_quantity;

                let location_type_id = line
                    .requisition_line_row
                    .location_type_id
                    .clone()
                    .unwrap_or_default();

                let available_volume = line.requisition_line_row.available_volume.unwrap_or(0.0);

                (
                    location_type_id,
                    current_item_volume,
                    available_volume,
                    volume_per_unit,
                )
            } else {
                (String::new(), 0.0, 0.0, 0.0)
            };

        let location_type = location_types
            .iter()
            .find(|lt| lt.location_type_row.id == location_type_id)
            .cloned()
            .map(|lt| lt.location_type_row);

        let used_volume = if !location_type_id.is_empty() {
            *used_volume_on_lines_for_type
                .get(&location_type_id)
                .unwrap_or(&0.0)
        } else {
            0.0
        };

        // Exclude current item volume since it's calculated in frontend
        let current_available_volume = initial_available_volume - used_volume + current_item_volume;

        output.insert(
            item_id.clone(),
            AvailableVolumeInfo {
                location_type,
                available_volume: current_available_volume,
                volume_per_unit,
            },
        );
    }

    Ok(output)
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_item_c, mock_location_1, mock_location_type_a,
            mock_location_type_b, mock_new_response_requisition, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        ItemRow, LocationRow, RequisitionLineRow,
    };

    fn location_a() -> LocationRow {
        LocationRow {
            location_type_id: Some(mock_location_type_a().id.clone()),
            ..mock_location_1()
        }
    }

    fn location_b() -> LocationRow {
        LocationRow {
            location_type_id: Some(mock_location_type_b().id.clone()),
            ..mock_location_1()
        }
    }

    fn item_a() -> ItemRow {
        ItemRow {
            volume_per_pack: 100.0,
            default_pack_size: 10.0,
            restricted_location_type_id: Some(mock_location_type_a().id.clone()),
            ..mock_item_a()
        }
    }
    fn item_b() -> ItemRow {
        ItemRow {
            volume_per_pack: 200.0,
            default_pack_size: 5.0,
            restricted_location_type_id: Some(mock_location_type_a().id.clone()),
            ..mock_item_b()
        }
    }

    fn item_c() -> ItemRow {
        ItemRow {
            volume_per_pack: 150.0,
            default_pack_size: 3.0,
            restricted_location_type_id: Some(mock_location_type_b().id.clone()),
            ..mock_item_c()
        }
    }

    fn requisition_line_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "test_line_a".to_string(),
            requisition_id: mock_new_response_requisition().id.clone(),
            item_link_id: item_a().id.clone(),
            supply_quantity: 3.0, // 3 units * 10 = 30
            location_type_id: Some(mock_location_type_a().id.clone()),
            available_volume: Some(1000.0),
            ..Default::default()
        }
    }

    fn requisition_line_b() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "test_line_b".to_string(),
            requisition_id: mock_new_response_requisition().id.clone(),
            item_link_id: item_b().id.clone(),
            supply_quantity: 2.0, // 2 units * 40 = 80
            location_type_id: Some(mock_location_type_a().id.clone()),
            available_volume: Some(1000.0),
            ..Default::default()
        }
    }

    fn requisition_line_c() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "test_line_c".to_string(),
            requisition_id: mock_new_response_requisition().id.clone(),
            item_link_id: item_c().id.clone(),
            location_type_id: Some(mock_location_type_b().id.clone()),
            available_volume: Some(500.0),
            ..Default::default()
        }
    }

    #[tokio::test]
    async fn test_get_requisition_available_volume_for_items() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_get_requisition_available_volume_for_items",
            MockDataInserts::all(),
            MockData {
                items: vec![item_a(), item_b(), item_c()],
                locations: vec![location_a(), location_b()],
                requisition_lines: vec![
                    requisition_line_a(),
                    requisition_line_b(),
                    requisition_line_c(),
                ],
                ..Default::default()
            },
        )
        .await;

        let requisition_id = &mock_new_response_requisition().id;

        let item_ids = vec![
            item_a().id.clone(),
            item_b().id.clone(),
            item_c().id.clone(),
        ];
        let result =
            get_requisition_available_volume_for_items(&connection, requisition_id, &item_ids)
                .unwrap();

        assert_eq!(result.len(), 3);

        let item_a_info = result.get(&item_a().id).unwrap();
        assert_eq!(item_a_info.volume_per_unit, 10.0); // 100 / 10

        let item_b_info = result.get(&item_b().id).unwrap();
        assert_eq!(item_b_info.volume_per_unit, 40.0); // 200 / 5

        let item_c_info = result.get(&item_c().id).unwrap();
        assert_eq!(item_c_info.volume_per_unit, 50.0); // 150 / 3

        assert_eq!(item_a_info.available_volume, 920.0); // Available for item1: 1000 - 110 + 30 = 920
        assert_eq!(item_b_info.available_volume, 970.0); // Available for item2: 1000 - 110 + 80 = 970
        assert_eq!(item_c_info.available_volume, 500.0); // Available for item3: 500ml
    }
}
