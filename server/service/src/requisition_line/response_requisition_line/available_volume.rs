use repository::{
    EqualFilter, LocationTypeFilter, LocationTypeRepository, LocationTypeRow, RepositoryError,
    RequisitionLineFilter, RequisitionLineRepository, StorageConnection,
};
use std::collections::HashMap;

pub fn used_volume_on_lines_for_type(
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

pub fn get_available_volume_for_items(
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
