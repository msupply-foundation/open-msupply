use super::validate::check_asset_exists;
use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
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

            AssetRowRepository::new(connection)
                .delete(&asset_id)
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
        if ctx_store_id != store_id {
            return Err(DeleteAssetError::AssetDoesNotBelongToCurrentStore);
        }
    }

    Ok(())
}
