use super::asset_internal_location_row::asset_internal_location::dsl::*;

use crate::LocationRowRepository;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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
    connection: &'a StorageConnection,
}

impl<'a> AssetInternalLocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetInternalLocationRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<i64, RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .on_conflict(id)
            .do_update()
            .set(asset_internal_location_row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(asset_internal_location_row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &AssetInternalLocationRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let location = LocationRowRepository::new(self.connection).find_one_by_id(&row.location_id);
        let store_id = match location {
            Ok(Some(location)) => Some(location.store_id),
            _ => None,
        };

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetInternalLocation,
            record_id: row.id.clone(),
            row_action: action,
            store_id,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all_by_location(
        &self,
        some_location_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(location_id.eq(some_location_id))
            .load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_all_by_asset(
        &self,
        some_asset_id: String,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(asset_id.eq(some_asset_id))
            .load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_internal_location_id: &str,
    ) -> Result<Option<AssetInternalLocationRow>, RepositoryError> {
        let result = asset_internal_location
            .filter(id.eq(asset_internal_location_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_internal_location_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(id.eq(asset_internal_location_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete_all_for_asset_id(
        &self,
        asset_id_to_delete_locations: &str,
    ) -> Result<(), RepositoryError> {
        diesel::delete(asset_internal_location)
            .filter(asset_id.eq(asset_id_to_delete_locations))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for AssetInternalLocationRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = AssetInternalLocationRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetInternalLocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
