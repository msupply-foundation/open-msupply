use super::asset_category_row::asset_category::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    asset_category (id) {
        id -> Text,
        name -> Text,
        asset_class_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "asset_category"]
pub struct AssetCategoryRow {
    pub id: String,
    pub name: String,
    #[column_name = "asset_class_id"]
    pub class_id: String,
}

impl Default for AssetCategoryRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            class_id: Default::default(),
        }
    }
}

pub struct AssetCategoryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCategoryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCategoryRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, asset_category_row: &AssetCategoryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_category)
            .values(asset_category_row)
            .on_conflict(id)
            .do_update()
            .set(asset_category_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, asset_category_row: &AssetCategoryRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_category)
            .values(asset_category_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(&self, asset_category_row: &AssetCategoryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_category)
            .values(asset_category_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetCategoryRow>, RepositoryError> {
        let result = asset_category.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_category_id: &str,
    ) -> Result<Option<AssetCategoryRow>, RepositoryError> {
        let result = asset_category
            .filter(id.eq(asset_category_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_category_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_category)
            .filter(id.eq(asset_category_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
