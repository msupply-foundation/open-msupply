use self::delete::{delete_asset, DeleteAssetError};
use self::insert::{insert_asset, InsertAsset, InsertAssetError};
use self::query::{get_asset, get_assets};
use self::update::{update_asset, UpdateAsset, UpdateAssetError};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::assets::asset::{Asset, AssetFilter, AssetSort};
use repository::{PaginationOption, StorageConnection};

pub mod delete;
pub mod insert;
pub mod query;
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
}

pub struct AssetService {}
impl AssetServiceTrait for AssetService {}

#[cfg(test)]
mod tests;
