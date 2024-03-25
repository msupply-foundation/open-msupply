use super::{query::get_asset, validate::check_asset_exists};
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
    ActivityLogType, RepositoryError, StorageConnection, StringFilter,
};

#[derive(PartialEq, Debug)]
pub enum InsertAssetError {
    AssetAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    SerialNumberAlreadyExists,
}

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
            AssetRowRepository::new(connection).upsert_one(&new_asset)?;

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

pub fn validate(
    input: &InsertAsset,
    connection: &StorageConnection,
) -> Result<(), InsertAssetError> {
    if check_asset_exists(&input.id, connection)?.is_some() {
        return Err(InsertAssetError::AssetAlreadyExists);
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
