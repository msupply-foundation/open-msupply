use super::{
    insert_log::create_logs_for_imported_mapping_dates,
    location::set_asset_location,
    query::get_asset,
    validate::{check_asset_exists, check_asset_number_exists},
};
use crate::sync::ActiveStoresOnSite;
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use chrono::{NaiveDate, Utc};
use repository::{
    asset_catalogue_item_row::AssetCatalogueItemRowRepository,
    assets::{
        asset::{AssetFilter, AssetRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    migrations::constants::COLD_CHAIN_EQUIPMENT_UUID,
    ActivityLogType, LocationRow, LocationTypeFilter, LocationTypeRepository, RepositoryError,
    StorageConnection, StringFilter, Upsert,
};
use util::uuid::uuid;

#[derive(PartialEq, Debug)]
pub enum InsertAssetError {
    AssetAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    SerialNumberAlreadyExists,
    AssetNumberAlreadyExists,
    InvalidMappingDate { key: String, value: String },
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertAsset {
    pub id: String,
    pub store_id: Option<String>,
    pub notes: Option<String>,
    pub asset_number: Option<String>,
    pub serial_number: Option<String>,
    pub catalogue_item_id: Option<String>,
    pub category_id: Option<String>,
    pub class_id: Option<String>,
    pub type_id: Option<String>,
    pub installation_date: Option<NaiveDate>,
    pub replacement_date: Option<NaiveDate>,
    pub properties: Option<String>,
    pub donor_name_id: Option<String>,
    pub warranty_start: Option<NaiveDate>,
    pub warranty_end: Option<NaiveDate>,
    pub needs_replacement: Option<bool>,
    pub locked_fields_json: Option<String>,
}

pub fn insert_asset(
    ctx: &ServiceContext,
    input: InsertAsset,
) -> Result<AssetRow, InsertAssetError> {
    let asset = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            // populate category_id, class_id, type_id from catalogue_item_id if present and valid
            let input = match input.catalogue_item_id.clone() {
                Some(catalogue_item_id) => {
                    match AssetCatalogueItemRowRepository::new(connection)
                        .find_one_by_id(&catalogue_item_id)?
                    {
                        Some(catalogue_item) => InsertAsset {
                            category_id: Some(catalogue_item.category_id),
                            class_id: Some(catalogue_item.class_id),
                            type_id: Some(catalogue_item.type_id),
                            ..input
                        },
                        None => input,
                    }
                }
                None => input,
            };

            let new_asset = generate(input);
            AssetRowRepository::new(connection).upsert_one(&new_asset, None)?;

            if let Some(props) = &new_asset.properties {
                create_logs_for_imported_mapping_dates(
                    connection,
                    &new_asset.id,
                    &ctx.user_id,
                    props,
                )?;
            }

            // Automatically create locations for this asset (if it's a cold chain asset, and store is active on this site)
            if new_asset.asset_class_id == Some(COLD_CHAIN_EQUIPMENT_UUID.to_string()) {
                let active_stores = ActiveStoresOnSite::get(&ctx.connection);
                let active_store_ids = match active_stores {
                    Ok(active_stores) => active_stores.store_ids(),
                    Err(_) => {
                        // If we can't get the active stores, just assume the asset is in this store (mainly for test cases)
                        vec![new_asset.store_id.clone().unwrap_or_default()]
                    }
                };

                // Check if the asset is in a store that is active before creating locations
                if let Some(store_id) = new_asset.store_id.clone() {
                    if active_store_ids.contains(&store_id) {
                        create_asset_locations(connection, &new_asset, store_id)?;
                    }
                }
            }

            activity_log_entry(
                ctx,
                ActivityLogType::AssetCreated,
                Some(new_asset.id.clone()),
                None,
                None,
            )?;

            get_asset(ctx, new_asset.id).map_err(InsertAssetError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset)
}

struct StorageZone {
    capacity_key: &'static str,
    temperature: f64,
    label: &'static str,
}

const STORAGE_ZONES: [StorageZone; 3] = [
    StorageZone {
        capacity_key: "storage_capacity_5c",
        temperature: 5.0,
        label: "+5°C",
    },
    StorageZone {
        capacity_key: "storage_capacity_20c",
        temperature: -20.0,
        label: "-20°C",
    },
    StorageZone {
        capacity_key: "storage_capacity_70c",
        temperature: -70.0,
        label: "-70°C",
    },
];

fn create_asset_locations(
    connection: &StorageConnection,
    asset: &AssetRow,
    store_id: String,
) -> Result<(), RepositoryError> {
    let asset_label = asset
        .asset_number
        .clone()
        .unwrap_or_else(|| "Asset".to_string());

    let properties = get_storage_properties(connection, asset)?;

    let zones: Vec<(&StorageZone, f64)> = STORAGE_ZONES
        .iter()
        .filter_map(|zone| {
            let volume = properties
                .get(zone.capacity_key)
                .and_then(|value| value.as_f64())
                .unwrap_or(0.0);
            (volume > 0.0).then_some((zone, volume))
        })
        .collect();

    if zones.is_empty() {
        let location = LocationRow {
            id: uuid(),
            name: asset_label.clone(),
            code: asset_label,
            on_hold: false,
            store_id,
            location_type_id: None,
            volume: 0.0,
        };
        location.upsert(connection)?;
        return set_asset_location(connection, &asset.id, vec![location.id]);
    }

    let location_types =
        LocationTypeRepository::new(connection).query_by_filter(LocationTypeFilter::new())?;

    let mut location_ids = Vec::new();

    for (zone, volume) in zones {
        let location_type_id = location_types
            .iter()
            .map(|location_type| &location_type.location_type_row)
            .find(|location_type| {
                location_type.min_temperature <= zone.temperature
                    && location_type.max_temperature >= zone.temperature
            })
            .map(|location_type| location_type.id.clone());

        let name = format!("{} {}", asset_label, zone.label);

        let location = LocationRow {
            id: uuid(),
            name: name.clone(),
            code: name,
            on_hold: false,
            store_id: store_id.clone(),
            location_type_id,
            volume,
        };
        location.upsert(connection)?;
        location_ids.push(location.id);
    }

    set_asset_location(connection, &asset.id, location_ids)
}

fn get_storage_properties(
    connection: &StorageConnection,
    asset: &AssetRow,
) -> Result<serde_json::Map<String, serde_json::Value>, RepositoryError> {
    let mut properties = serde_json::Map::new();

    if let Some(catalogue_item_id) = &asset.catalogue_item_id {
        if let Some(catalogue_item) =
            AssetCatalogueItemRowRepository::new(connection).find_one_by_id(catalogue_item_id)?
        {
            if let Some(catalogue_properties) = catalogue_item.properties {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(
                    &catalogue_properties,
                ) {
                    properties.extend(parsed);
                }
            }
        }
    }

    if let Some(asset_properties) = &asset.properties {
        if let Ok(parsed) =
            serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(asset_properties)
        {
            properties.extend(parsed);
        }
    }

    Ok(properties)
}

pub fn validate(
    input: &InsertAsset,
    connection: &StorageConnection,
) -> Result<(), InsertAssetError> {
    if check_asset_exists(&input.id, connection)?.is_some() {
        return Err(InsertAssetError::AssetAlreadyExists);
    }

    // Check asset number is unique (on this site)
    if let Some(asset_number) = &input.asset_number {
        if !check_asset_number_exists(connection, asset_number, None)?.is_empty() {
            return Err(InsertAssetError::AssetNumberAlreadyExists);
        }
    }

    // Check the serial number is unique (if present)
    if let Some(serial_number) = &input.serial_number {
        if AssetRepository::new(connection)
            .query_one(AssetFilter::new().serial_number(StringFilter::equal_to(serial_number)))?
            .is_some()
        {
            return Err(InsertAssetError::SerialNumberAlreadyExists);
        }
    }

    Ok(())
}

pub fn generate(
    InsertAsset {
        id,
        store_id,
        notes,
        asset_number,
        serial_number,
        catalogue_item_id,
        installation_date,
        replacement_date,
        category_id,
        class_id,
        type_id,
        properties,
        donor_name_id,
        warranty_start,
        warranty_end,
        needs_replacement,
        locked_fields_json,
    }: InsertAsset,
) -> AssetRow {
    AssetRow {
        id,
        store_id,
        notes,
        asset_number,
        serial_number,
        catalogue_item_id,
        installation_date,
        replacement_date,
        created_datetime: Utc::now().naive_utc(),
        modified_datetime: Utc::now().naive_utc(),
        deleted_datetime: None,
        asset_category_id: Some(category_id.unwrap_or_default()),
        asset_class_id: Some(class_id.unwrap_or_default()),
        asset_type_id: Some(type_id.unwrap_or_default()),
        properties,
        donor_name_id,
        warranty_start,
        warranty_end,
        needs_replacement,
        locked_fields_json,
    }
}

impl From<RepositoryError> for InsertAssetError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
