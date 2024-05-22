use crate::service_provider::ServiceContext;

use self::delete::{delete_asset_catalogue_item, DeleteAssetCatalogueItemError};
use self::insert::{
    insert_asset_catalogue_item, InsertAssetCatalogueItem, InsertAssetCatalogueItemError,
};

use self::query_catalogue_item::{get_asset_catalogue_item, get_asset_catalogue_items};
use self::query_catalogue_property::{
    get_asset_catalogue_properties, get_asset_catalogue_property,
};
use self::query_category::{get_asset_categories, get_asset_category};
use self::query_class::{get_asset_class, get_asset_classes};
use self::query_type::{get_asset_type, get_asset_types};

use super::{ListError, ListResult};
use repository::asset_catalogue_property::AssetCataloguePropertyFilter;
use repository::asset_catalogue_property_row::AssetCataloguePropertyRow;
use repository::RepositoryError;
use repository::{
    assets::{
        asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemSort},
        asset_catalogue_item_row::AssetCatalogueItemRow,
        asset_category::{AssetCategoryFilter, AssetCategorySort},
        asset_category_row::AssetCategoryRow,
        asset_class::{AssetClassFilter, AssetClassSort},
        asset_class_row::AssetClassRow,
        asset_type::{AssetTypeFilter, AssetTypeSort},
        asset_type_row::AssetTypeRow,
    },
    PaginationOption, StorageConnection,
};

pub mod delete;
pub mod insert;
pub mod query_catalogue_item;
pub mod query_catalogue_property;
pub mod query_category;
pub mod query_class;
pub mod query_type;
pub trait AssetCatalogueServiceTrait: Sync + Send {
    fn get_asset_catalogue_items(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetCatalogueItemFilter>,
        sort: Option<AssetCatalogueItemSort>,
    ) -> Result<ListResult<AssetCatalogueItemRow>, ListError> {
        get_asset_catalogue_items(connection, pagination, filter, sort)
    }

    fn get_asset_catalogue_item(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
        get_asset_catalogue_item(connection, id)
    }

    fn get_asset_classes(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetClassFilter>,
        sort: Option<AssetClassSort>,
    ) -> Result<ListResult<AssetClassRow>, ListError> {
        get_asset_classes(connection, pagination, filter, sort)
    }

    fn get_asset_class(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        get_asset_class(connection, id)
    }

    fn get_asset_categories(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetCategoryFilter>,
        sort: Option<AssetCategorySort>,
    ) -> Result<ListResult<AssetCategoryRow>, ListError> {
        get_asset_categories(connection, pagination, filter, sort)
    }

    fn get_asset_category(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<Option<AssetCategoryRow>, RepositoryError> {
        get_asset_category(connection, id)
    }

    fn get_asset_types(
        &self,
        connection: &StorageConnection,
        pagination: Option<PaginationOption>,
        filter: Option<AssetTypeFilter>,
        sort: Option<AssetTypeSort>,
    ) -> Result<ListResult<AssetTypeRow>, ListError> {
        get_asset_types(connection, pagination, filter, sort)
    }

    fn get_asset_type(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<Option<AssetTypeRow>, RepositoryError> {
        get_asset_type(connection, id)
    }

    fn insert_asset_catalogue_item(
        &self,
        ctx: &ServiceContext,
        item: InsertAssetCatalogueItem,
    ) -> Result<AssetCatalogueItemRow, InsertAssetCatalogueItemError> {
        insert_asset_catalogue_item(ctx, item)
    }

    fn delete_asset_catalogue_item(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<String, DeleteAssetCatalogueItemError> {
        delete_asset_catalogue_item(ctx, id)
    }

    fn get_asset_catalogue_properties(
        &self,
        connection: &StorageConnection,
        filter: Option<AssetCataloguePropertyFilter>,
    ) -> Result<ListResult<AssetCataloguePropertyRow>, ListError> {
        get_asset_catalogue_properties(connection, filter)
    }

    fn get_asset_catalogue_property(
        &self,
        connection: &StorageConnection,
        id: String,
    ) -> Result<Option<AssetCataloguePropertyRow>, RepositoryError> {
        get_asset_catalogue_property(connection, id)
    }
}

pub struct CatalogueService {}

impl AssetCatalogueServiceTrait for CatalogueService {}

#[cfg(test)]
mod tests;
