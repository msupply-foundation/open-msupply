use super::asset_internal_location_row::asset_internal_location::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    asset_internal_location (id) {
        id -> Text,
        asset_id -> Text,
        location_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "asset_internal_location"]
pub struct AssetInternalLocationRow {
    pub id: String,
    pub asset_id: String,
    pub location_id: String,
}

pub struct AssetLocationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLocationRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .on_conflict(id)
            .do_update()
            .set(asset_internal_location_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_internal_location)
            .values(asset_internal_location_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all_by_location(
        &self,
        some_location_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(location_id.eq(some_location_id))
            .load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_all_by_asset(
        &self,
        some_asset_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(asset_id.eq(some_asset_id))
            .load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_internal_location_id: &str,
    ) -> Result<Option<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(id.eq(asset_internal_location_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_internal_location_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(id.eq(asset_internal_location_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete_all_for_asset_id(
        &self,
        asset_id_to_delete_locations: &str,
    ) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(asset_id.eq(asset_id_to_delete_locations))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
