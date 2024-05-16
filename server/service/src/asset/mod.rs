use self::delete::{delete_asset, DeleteAssetError};
use self::delete_log_reason::{delete_log_reason, DeleteAssetLogReasonError};
use self::insert::{insert_asset, InsertAsset, InsertAssetError};
use self::insert_log::{insert_asset_log, InsertAssetLog, InsertAssetLogError};
use self::insert_log_reason::{
    insert_asset_log_reason, InsertAssetLogReason, InsertAssetLogReasonError,
};
use self::query::{get_asset, get_assets};
use self::query_asset_property::get_asset_properties;
use self::query_log::{get_asset_log, get_asset_logs};
use self::query_log_reason::{get_asset_log_reason, get_asset_log_reasons};
use self::update::{update_asset, UpdateAsset, UpdateAssetError};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::asset_log_reason::{AssetLogReason, AssetLogReasonFilter, AssetLogReasonSort};
use repository::asset_property::AssetPropertyFilter;
use repository::asset_property_row::AssetPropertyRow;
use repository::assets::asset::{Asset, AssetFilter, AssetSort};
use repository::assets::asset_log::{AssetLog, AssetLogFilter, AssetLogSort};
use repository::{PaginationOption, StorageConnection};

pub mod delete;
pub mod delete_log_reason;
pub mod insert;
pub mod insert_asset_property;
pub mod insert_log;
pub mod insert_log_reason;
pub mod location;
pub mod query;
pub mod query_asset_property;
pub mod query_log;
pub mod query_log_reason;
pub mod update;
mod validate;

pub trait AssetServiceTrait: Sync + Send {
    fn get_assets(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetFilter>,
        sort: Option<AssetSort>,
    ) -> Result<ListResult<Asset>, ListError> {
        get_assets(connection, pagination, filter, sort)
    }

    fn get_asset(&self, ctx: &ServiceContext, id: String) -> Result<Asset, SingleRecordError> {
        get_asset(ctx, id)
    }

    fn insert_asset(
        &self,
        ctx: &ServiceContext,
        input: InsertAsset,
    ) -> Result<Asset, InsertAssetError> {
        insert_asset(ctx, input)
    }

    fn update_asset(
        &self,
        ctx: &ServiceContext,
        input: UpdateAsset,
    ) -> Result<Asset, UpdateAssetError> {
        update_asset(ctx, input)
    }

    fn delete_asset(&self, ctx: &ServiceContext, id: String) -> Result<String, DeleteAssetError> {
        delete_asset(ctx, id)
    }

    fn delete_log_reason(
        &self,
        ctx: &ServiceContext,
        reason_id: String,
    ) -> Result<String, DeleteAssetLogReasonError> {
        delete_log_reason(ctx, reason_id)
    }

    fn get_asset_logs(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetLogFilter>,
        sort: Option<AssetLogSort>,
    ) -> Result<ListResult<AssetLog>, ListError> {
        get_asset_logs(connection, pagination, filter, sort)
    }

    fn get_asset_log(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<AssetLog, SingleRecordError> {
        get_asset_log(ctx, id)
    }

    fn insert_asset_log(
        &self,
        ctx: &ServiceContext,
        input: InsertAssetLog,
    ) -> Result<AssetLog, InsertAssetLogError> {
        insert_asset_log(ctx, input)
    }

    fn get_asset_log_reasons(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetLogReasonFilter>,
        sort: Option<AssetLogReasonSort>,
    ) -> Result<ListResult<AssetLogReason>, ListError> {
        get_asset_log_reasons(connection, pagination, filter, sort)
    }

    fn get_asset_log_reason(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<AssetLogReason, SingleRecordError> {
        get_asset_log_reason(ctx, id)
    }

    fn insert_asset_log_reason(
        &self,
        ctx: &ServiceContext,
        input: InsertAssetLogReason,
    ) -> Result<AssetLogReason, InsertAssetLogReasonError> {
        insert_asset_log_reason(ctx, input)
    }

    fn get_asset_properties(
        &self,
        connection: &StorageConnection,
        filter: Option<AssetPropertyFilter>,
    ) -> Result<ListResult<AssetPropertyRow>, ListError> {
        get_asset_properties(connection, filter)
    }
}

pub struct AssetService {}
impl AssetServiceTrait for AssetService {}

#[cfg(test)]
mod tests;
