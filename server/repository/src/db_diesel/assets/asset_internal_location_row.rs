use super::asset_internal_location_row::asset_internal_location::dsl::*;

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogRepository, RowActionType};
use crate::diesel_macros::define_batch_table;
use serde::Deserialize;
use serde::Serialize;

use diesel::prelude::*;

define_batch_table! {
    struct: AssetInternalLocationRow,
    repo: AssetInternalLocationRowRepository,
    table: asset_internal_location (id) {
        id -> Text,
        asset_id -> Text,
        location_id -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
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

    pub fn _upsert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_internal_location)
            .values(asset_internal_location_row)
            .on_conflict(id)
            .do_update()
            .set(asset_internal_location_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_internal_location_row: &AssetInternalLocationRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_internal_location_row)?;
        let changelog = AssetInternalLocationRow::generate_changelog(
            RowOrId::Row(asset_internal_location_row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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
        some_asset_id: &str,
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
        let changelog = match AssetInternalLocationRow::generate_changelog(
            RowOrId::Id(asset_internal_location_id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        ) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => {
                return Ok(()); // already deleted?
            }
            Err(e) => return Err(e),
        };
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(asset_internal_location)
            .filter(id.eq(asset_internal_location_id))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn delete_all_for_asset_id(
        &self,
        asset_id_to_delete_locations: &str,
    ) -> Result<(), RepositoryError> {
        for asset in self.find_all_by_asset(asset_id_to_delete_locations)? {
            self.delete(&asset.id)?;
        }
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        Ok(asset_internal_location::table
            .filter(asset_internal_location::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(asset_internal_location.filter(id.eq_any(ids)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
