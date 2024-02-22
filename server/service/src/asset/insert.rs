use super::query::get_asset;
use super::validate::check_asset_does_not_exist;
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::NaiveDateTime;
use repository::{Asset, AssetRow, AssetRowRepository, RepositoryError, StorageConnection};

#[derive(PartialEq, Debug)]
pub enum InsertAssetError {
    AssetAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertAsset {
    pub id: String,
    pub store_id: Option<String>,
}

pub fn insert_asset(ctx: &ServiceContext, input: InsertAsset) -> Result<Asset, InsertAssetError> {
    let asset = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_asset = generate(&ctx.store_id, input);
            AssetRowRepository::new(&connection).upsert_one(&new_asset)?;

            get_asset(ctx, new_asset.id).map_err(InsertAssetError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset)
}

pub fn validate(
    input: &InsertAsset,
    connection: &StorageConnection,
) -> Result<(), InsertAssetError> {
    if !check_asset_does_not_exist(&input.id, connection)? {
        return Err(InsertAssetError::AssetAlreadyExists);
    }

    Ok(())
}

pub fn generate(store_id: &str, InsertAsset { id }: InsertAsset) -> AssetRow {
    AssetRow { id }
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
