use self::query_catalogue_item::{get_asset_catalogue_item, get_asset_catalogue_items};
use self::query_classes::{get_asset_class, get_asset_classes};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    assets::{
        asset_catalogue_item::{
            AssetCatalogueItem, AssetCatalogueItemFilter, AssetCatalogueItemSort,
        },
        asset_class::{AssetClass, AssetClassFilter, AssetClassSort},
    },
    PaginationOption, StorageConnection,
};

pub mod query_catalogue_item;
pub mod query_classes;
pub mod query_types;

pub trait AssetCatalogueServiceTrait: Sync + Send {
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

    fn get_asset_classes(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetClassFilter>,
        sort: Option<AssetClassSort>,
    ) -> Result<ListResult<AssetClass>, ListError> {
        get_asset_classes(connection, pagination, filter, sort)
    }

    fn get_asset_class(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<AssetClass, SingleRecordError> {
        get_asset_class(ctx, id)
    }
}
