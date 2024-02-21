use super::asset_catalogue_row::asset_catalogue::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    asset_catalogue (id) {
        id -> Text,
        code -> Text,
        asset_class_id -> Text,
        asset_category_id -> Text,
        asset_type_id -> Text,
        manufacturer -> Nullable<Text>,
        model -> Text,
        catalogue -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "asset_catalogue"]
pub struct AssetCatalogueRow {
    pub id: String,
    pub catalogue: String,
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

impl Default for AssetCatalogueRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            catalogue: Default::default(),
            category_id: Default::default(),
            class_id: Default::default(),
            code: Default::default(),
            manufacturer: Default::default(),
            model: Default::default(),
            type_id: Default::default(),
        }
    }
}

pub struct AssetCatalogueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        asset_catalogue_row: &AssetCatalogueRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue)
            .values(asset_catalogue_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        asset_catalogue_row: &AssetCatalogueRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue)
            .values(asset_catalogue_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &self,
        asset_catalogue_row: &AssetCatalogueRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue)
            .values(asset_catalogue_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetCatalogueRow>, RepositoryError> {
        let result = asset_catalogue.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_id: &str,
    ) -> Result<Option<AssetCatalogueRow>, RepositoryError> {
        let result = asset_catalogue
            .filter(id.eq(asset_catalogue_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_catalogue_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue)
            .filter(id.eq(asset_catalogue_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
