use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use repository::{
    asset_log_reason_row::AssetLogReasonRow, asset_log_row::AssetLogStatus,
    assets::asset_log_reason_row::AssetLogReasonRowRepository, ActivityLogType, RepositoryError,
    StorageConnection,
};

use super::query_log_reason::get_asset_log_reason;

#[derive(PartialEq, Debug)]
pub enum InsertAssetLogReasonError {
    AssetLogReasonAlreadyExists,
    AssetLogStatusNotExist,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
    InsufficientPermission,
}

pub struct InsertAssetLogReason {
    pub id: String,
    pub asset_log_status: AssetLogStatus,
    pub reason: String,
}

pub fn insert_asset_log_reason(
    ctx: &ServiceContext,
    input: InsertAssetLogReason,
) -> Result<AssetLogReasonRow, InsertAssetLogReasonError> {
    let asset_log = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_asset_log_reason = generate(ctx, input);
            AssetLogReasonRowRepository::new(connection).upsert_one(&new_asset_log_reason)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetLogReasonCreated,
                Some(new_asset_log_reason.id.clone()),
                None,
                None,
            )?;

            get_asset_log_reason(ctx, new_asset_log_reason.id)
                .map_err(InsertAssetLogReasonError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset_log)
}

pub fn validate(
    _input: &InsertAssetLogReason,
    _connection: &StorageConnection,
) -> Result<(), InsertAssetLogReasonError> {
    // TODO add validation checks
    Ok(())
}

pub fn generate(
    _ctx: &ServiceContext,
    InsertAssetLogReason {
        id,
        asset_log_status,
        reason,
    }: InsertAssetLogReason,
) -> AssetLogReasonRow {
    AssetLogReasonRow {
        id,
        asset_log_status,
        reason,
        deleted_datetime: None,
    }
}

impl From<RepositoryError> for InsertAssetLogReasonError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetLogReasonError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetLogReasonError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetLogReasonError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
