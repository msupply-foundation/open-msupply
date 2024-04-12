use super::validate::check_asset_exists;
use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::asset_log_reason_row::AssetLogReasonRowRepository;
use repository::assets::asset_internal_location_row::AssetInternalLocationRowRepository;
use repository::{
    assets::asset_row::AssetRowRepository, ActivityLogType, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum DeleteAssetLogReasonError {
    ReasonDoesNotExist,
    DatabaseError(RepositoryError),
}
impl From<RepositoryError> for DeleteAssetLogReasonError {
    fn from(error: RepositoryError) -> Self {
        DeleteAssetLogReasonError::DatabaseError(error)
    }
}

pub fn delete_log_reason(
    ctx: &ServiceContext,
    reason_id: String,
) -> Result<String, DeleteAssetLogReasonError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &reason_id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetLogReasonDeleted,
                Some(reason_id.clone()),
                None,
                None,
            )?;

            let _deleted_location = AssetInternalLocationRowRepository::new(&connection)
                .delete_all_for_asset_id(&reason_id);

            AssetLogReasonRowRepository::new(connection)
                .delete(&reason_id)
                .map_err(DeleteAssetLogReasonError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(reason_id)
}

pub fn validate(
    _connection: &StorageConnection,
    _ctx_store_id: &str,
    _asset_id: &str,
) -> Result<(), DeleteAssetLogReasonError> {
    // TODO add validation
    Ok(())
}
