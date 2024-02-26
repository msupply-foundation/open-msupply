use super::{query::get_asset, validate::check_asset_exists};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::Utc;
use repository::{
    assets::asset_row::{AssetRow, AssetRowRepository},
    RepositoryError, StorageConnection,
};

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
    pub name: Option<String>,
    pub code: Option<String>,
    pub serial_number: Option<String>,
    pub catalogue_item_id: Option<String>,
    pub installation_date: Option<chrono::NaiveDate>,
    pub replacement_date: Option<chrono::NaiveDate>,
}

pub fn update_asset(
    ctx: &ServiceContext,
    input: UpdateAsset,
) -> Result<AssetRow, UpdateAssetError> {
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
    ctx_store_id: &str,
    input: &UpdateAsset,
) -> Result<AssetRow, UpdateAssetError> {
    let asset_row = match check_asset_exists(&input.id, connection)? {
        Some(asset_row) => asset_row,
        None => return Err(UpdateAssetError::AssetDoesNotExist),
    };
    if let Some(store_id) = &asset_row.store_id {
        // TODO: confirm, maybe people can just create them on central for any store
        if ctx_store_id != store_id {
            return Err(UpdateAssetError::AssetDoesNotBelongToCurrentStore);
        }
    }

    Ok(asset_row)
}

pub fn generate(
    _ctx_store_id: &str,
    UpdateAsset {
        id: _,
        store_id,
        name,
        code,
        serial_number,
        catalogue_item_id,
        installation_date,
        replacement_date,
    }: UpdateAsset,
    mut asset_row: AssetRow,
) -> AssetRow {
    asset_row.store_id = store_id;
    asset_row.name = name.unwrap_or(asset_row.name);
    asset_row.code = code.unwrap_or(asset_row.code);

    // If these fields are None in UpdateAsset, they won't be updated by diesel... (pretty sure?)
    asset_row.serial_number = serial_number;
    asset_row.catalogue_item_id = catalogue_item_id;
    asset_row.installation_date = installation_date;
    asset_row.replacement_date = replacement_date;

    // Set the modified date time
    asset_row.modified_datetime = Utc::now().naive_utc();

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
