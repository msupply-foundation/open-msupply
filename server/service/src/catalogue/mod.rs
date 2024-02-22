use self::query::{get_asset_catalogue_item, get_asset_catalogue_items};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    assets::asset_catalogue_item::{
        AssetCatalogueItem, AssetCatalogueItemFilter, AssetCatalogueItemSort,
    },
    PaginationOption, StorageConnection,
};

pub mod query;

pub trait AssetCatalogueItemServiceTrait: Sync + Send {
    fn get_asset_catalogue_items(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetCatalogueItemFilter>,
        sort: Option<AssetCatalogueItemSort>,
    ) -> Result<ListResult<AssetCatalogueItem>, ListError> {
        get_asset_catalogue_items(connection, pagination, filter, sort)
    }

    fn get_asset_catalogue_item(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<AssetCatalogueItem, SingleRecordError> {
        get_asset_catalogue_item(ctx, id)
    }
}
