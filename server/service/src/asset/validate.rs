use repository::{
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    RepositoryError, StorageConnection,
};

use super::insert_log::InsertAssetLog;

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    Ok(AssetRowRepository::new(connection).find_one_by_id(id)?)
}

pub fn check_asset_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetLogRow>, RepositoryError> {
    Ok(AssetLogRowRepository::new(connection).find_one_by_id(id)?)
}

pub fn check_user_is_user_or_server_admin(
    input: &InsertAssetLog,
    connection: &StorageConnection,
) -> bool {
    true
}
