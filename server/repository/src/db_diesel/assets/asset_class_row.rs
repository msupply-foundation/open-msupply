use super::asset_class_row::asset_class::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;
use serde::Deserialize;
use serde::Serialize;

table! {
    asset_class (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = asset_class)]
pub struct AssetClassRow {
    pub id: String,
    pub name: String,
}

pub struct AssetClassRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> AssetClassRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        AssetClassRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .on_conflict(id)
            .do_update()
            .set(asset_class_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_class)
            .values(asset_class_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(&mut self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetClassRow>, RepositoryError> {
        let result = asset_class.load(&mut self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &mut self,
        asset_class_id: &str,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        let result = asset_class
            .filter(id.eq(asset_class_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, asset_class_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_class)
            .filter(id.eq(asset_class_id))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for AssetClassRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        AssetClassRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            AssetClassRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
