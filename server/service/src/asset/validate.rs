use repository::{
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

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

pub fn check_user_is_user(ctx: &ServiceContext, input: &InsertAssetLog) -> bool {
    return ctx.user_id == input.user_id;
}

// pub fn check_reason_matches_status(input: &InsertAssetLog) -> bool {
//     return match input.status {
//         None => true
//         Some()
//     }
// }
