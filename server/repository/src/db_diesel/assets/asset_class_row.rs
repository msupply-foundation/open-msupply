use super::asset_class_row::asset_class::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    asset_class (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "asset_class"]
pub struct AssetClassRow {
    pub id: String,
    pub name: String,
}

impl Default for AssetClassRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
        }
    }
}

pub struct AssetClassRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetClassRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetClassRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .on_conflict(id)
            .do_update()
            .set(asset_class_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_class)
            .values(asset_class_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(&self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetClassRow>, RepositoryError> {
        let result = asset_class.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_class_id: &str,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        let result = asset_class
            .filter(id.eq(asset_class_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_class_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_class)
            .filter(id.eq(asset_class_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
