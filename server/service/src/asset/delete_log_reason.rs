use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use repository::asset_log_reason_row::AssetLogReasonRowRepository;
use repository::assets::asset_internal_location_row::AssetInternalLocationRowRepository;
use repository::{ActivityLogType, RepositoryError, StorageConnection};

use super::validate::check_asset_log_reason_exists;

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
            validate(connection, &reason_id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetLogReasonDeleted,
                Some(reason_id.clone()),
                None,
                None,
            )?;

            let _deleted_location = AssetInternalLocationRowRepository::new(connection)
                .delete_all_for_asset_id(&reason_id);

            AssetLogReasonRowRepository::new(connection)
                .delete(&reason_id)
                .map_err(DeleteAssetLogReasonError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(reason_id)
}

pub fn validate(
    connection: &StorageConnection,
    reason_id: &str,
) -> Result<(), DeleteAssetLogReasonError> {
    match check_asset_log_reason_exists(reason_id, connection)? {
        Some(_reason_row) => Ok(()),
        None => Err(DeleteAssetLogReasonError::ReasonDoesNotExist),
    }
}
