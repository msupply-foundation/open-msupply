use super::{query_asset_property::get_asset_property, validate::check_asset_property_exists};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};

use repository::{
    assets::asset_property_row::{AssetPropertyRow, AssetPropertyRowRepository},
    types::PropertyValueType,
    ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertAssetPropertyError {
    AssetPropertyAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertAssetProperty {
    pub id: String,
    pub key: String,
    pub name: String,
    pub asset_class_id: Option<String>,
    pub asset_category_id: Option<String>,
    pub asset_type_id: Option<String>,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
}

pub fn insert_asset_property(
    ctx: &ServiceContext,
    input: InsertAssetProperty,
) -> Result<AssetPropertyRow, InsertAssetPropertyError> {
    let asset_property = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_asset_property = generate(ctx, input);
            AssetPropertyRowRepository::new(connection).upsert_one(&new_asset_property)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetPropertyCreated,
                Some(new_asset_property.id.clone()),
                None,
                None,
            )?;

            get_asset_property(ctx, new_asset_property.id).map_err(InsertAssetPropertyError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset_property)
}

pub fn validate(
    input: &InsertAssetProperty,
    connection: &StorageConnection,
) -> Result<(), InsertAssetPropertyError> {
    if check_asset_property_exists(&input.id, connection)?.is_some() {
        return Err(InsertAssetPropertyError::AssetPropertyAlreadyExists);
    }
    // TODO: Check key is unique

    Ok(())
}

pub fn generate(
    _ctx: &ServiceContext,
    InsertAssetProperty {
        id,
        key,
        name,
        asset_class_id,
        asset_category_id,
        asset_type_id,
        value_type,
        allowed_values,
    }: InsertAssetProperty,
) -> AssetPropertyRow {
    AssetPropertyRow {
        id,
        key,
        name,
        asset_class_id,
        asset_category_id,
        asset_type_id,
        value_type,
        allowed_values,
    }
}

impl From<RepositoryError> for InsertAssetPropertyError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetPropertyError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetPropertyError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetPropertyError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
