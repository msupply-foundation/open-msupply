use super::asset_type_row::asset_type::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    asset_type (id) {
        id -> Text,
        name -> Text,
        asset_category_id -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[table_name = "asset_type"]
pub struct AssetTypeRow {
    pub id: String,
    pub name: String,
    #[column_name = "asset_category_id"]
    pub category_id: String,
}

impl Default for AssetTypeRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            category_id: Default::default(),
        }
    }
}

pub struct AssetTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetTypeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, asset_type_row: &AssetTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_type)
            .values(asset_type_row)
            .on_conflict(id)
            .do_update()
            .set(asset_type_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, asset_type_row: &AssetTypeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_type)
            .values(asset_type_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(&self, asset_type_row: &AssetTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_type)
            .values(asset_type_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetTypeRow>, RepositoryError> {
        let result = asset_type.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_type_id: &str,
    ) -> Result<Option<AssetTypeRow>, RepositoryError> {
        let result = asset_type
            .filter(id.eq(asset_type_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_type_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_type)
            .filter(id.eq(asset_type_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for AssetTypeRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        AssetTypeRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
