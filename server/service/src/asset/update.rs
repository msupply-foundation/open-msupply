use super::{query::get_asset, validate::check_asset_exists};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{asset::Asset, AssetRow, AssetRowRepository, RepositoryError, StorageConnection};

#[derive(PartialEq, Debug)]
pub enum UpdateAssetError {
    AssetDoesNotExist,
    AssetDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    LocationIsOnHold,
    DatabaseError(RepositoryError),
}

pub struct UpdateAsset {
    pub id: String,
    pub store_id: Option<String>,
}

pub fn update_asset(ctx: &ServiceContext, input: UpdateAsset) -> Result<Asset, UpdateAssetError> {
    let asset = ctx
        .connection
        .transaction_sync(|connection| {
            let asset_row = validate(connection, &ctx.store_id, &input)?;
            let updated_asset_row = generate(&ctx.store_id, input, asset_row);
            AssetRowRepository::new(&connection).upsert_one(&updated_asset_row)?;

            get_asset(ctx, updated_asset_row.id).map_err(UpdateAssetError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateAsset,
) -> Result<AssetRow, UpdateAssetError> {
    let asset_row = match check_asset_exists(&input.id, connection)? {
        Some(asset_row) => asset_row,
        None => return Err(UpdateAssetError::AssetDoesNotExist),
    };
    if asset_row.store_id != store_id.to_string() {
        return Err(UpdateAssetError::AssetDoesNotBelongToCurrentStore);
    }

    Ok(asset_row)
}

pub fn generate(
    store_id: &str,
    UpdateAsset { id: _, store_id }: UpdateAsset,
    mut asset_row: AssetRow,
) -> AssetRow {
    asset_row.store_id = store_id.to_string();
    asset_row
}

impl From<RepositoryError> for UpdateAssetError {
    fn from(error: RepositoryError) -> Self {
        UpdateAssetError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateAssetError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateAssetError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
