use super::asset_internal_location_row::asset_internal_location::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    asset_internal_location (id) {
        id -> Text,
        asset_id -> Text,
        location_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[diesel(table_name = asset_internal_location)]
pub struct AssetInternalLocationRow {
    pub id: String,
    pub asset_id: String,
    pub location_id: String,
}

pub struct AssetInternalLocationRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> AssetInternalLocationRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        AssetInternalLocationRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &mut self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .on_conflict(id)
            .do_update()
            .set(asset_internal_location_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &mut self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_internal_location)
            .values(asset_internal_location_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &mut self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_all_by_location(
        &mut self,
        some_location_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(location_id.eq(some_location_id))
            .load(&mut self.connection.connection);
        Ok(result?)
    }

    pub fn find_all_by_asset(
        &mut self,
        some_asset_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(asset_id.eq(some_asset_id))
            .load(&mut self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &mut self,
        asset_internal_location_id: &str,
    ) -> Result<Option<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(id.eq(asset_internal_location_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, asset_internal_location_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(id.eq(asset_internal_location_id))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn delete_all_for_asset_id(
        &mut self,
        asset_id_to_delete_locations: &str,
    ) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(asset_id.eq(asset_id_to_delete_locations))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for AssetInternalLocationRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = AssetInternalLocationRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            AssetInternalLocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
