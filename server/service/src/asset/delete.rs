use super::validate::check_asset_exists;
use crate::sync::CentralServerConfig;
use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::assets::asset_internal_location_row::AssetInternalLocationRowRepository;
use repository::{
    assets::asset_row::AssetRowRepository, ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum DeleteAssetError {
    AssetDoesNotExist,
    AssetDoesNotBelongToCurrentStore,
    DatabaseError(RepositoryError),
}
impl From<RepositoryError> for DeleteAssetError {
    fn from(error: RepositoryError) -> Self {
        DeleteAssetError::DatabaseError(error)
    }
}

pub fn delete_asset(ctx: &ServiceContext, asset_id: String) -> Result<String, DeleteAssetError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &asset_id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetDeleted,
                Some(asset_id.clone()),
                None,
                None,
            )?;

            // This means that on soft deletion of asset, location assignments will be hard deleted.
            // If we bring assets back, they won't retain their location assignments.
            // This was done to make validation checks easier for assigning locations to assets
            let _deleted_location = AssetInternalLocationRowRepository::new(connection)
                .delete_all_for_asset_id(&asset_id);

            AssetRowRepository::new(connection)
                .mark_deleted(&asset_id)
                .map_err(DeleteAssetError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset_id)
}

pub fn validate(
    connection: &StorageConnection,
    ctx_store_id: &str,
    asset_id: &str,
) -> Result<(), DeleteAssetError> {
    let asset_row = match check_asset_exists(asset_id, connection)? {
        Some(asset_row) => asset_row,
        None => return Err(DeleteAssetError::AssetDoesNotExist),
    };

    if let Some(store_id) = &asset_row.store_id {
        if ctx_store_id != store_id && !CentralServerConfig::is_central_server() {
            return Err(DeleteAssetError::AssetDoesNotBelongToCurrentStore);
        }
    }

    Ok(())
}
