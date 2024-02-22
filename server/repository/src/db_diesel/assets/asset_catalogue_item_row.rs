use super::asset_catalogue_item_row::asset_catalogue_item::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    asset_catalogue_item (id) {
        id -> Text,
        asset_category_id -> Text,
        asset_class_id -> Text,
        code -> Text,
        manufacturer -> Nullable<Text>,
        model -> Text,
        asset_type_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[table_name = "asset_catalogue_item"]
#[changeset_options(treat_none_as_null = "true")]
pub struct AssetCatalogueItemRow {
    pub id: String,
    #[column_name = "asset_category_id"]
    pub category_id: String,
    #[column_name = "asset_class_id"]
    pub class_id: String,
    pub code: String,
    pub manufacturer: Option<String>,
    pub model: String,
    #[column_name = "asset_type_id"]
    pub type_id: String,
}

pub struct AssetCatalogueItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item.load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_item_id: &str,
    ) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item
            .filter(id.eq(asset_catalogue_item_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_catalogue_item_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue_item)
            .filter(id.eq(asset_catalogue_item_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
