use super::asset_internal_location_row::asset_internal_location::dsl::*;

use crate::asset_row::AssetRowRepository;
use crate::Delete;
use crate::LocationRowRepository;
use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{ChangelogSyncType, Upsert};
use serde::Deserialize;
use serde::Serialize;

use diesel::prelude::*;

table! {
    asset_internal_location (id) {
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

impl AssetInternalLocationRow {
    pub(crate) fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let store_id_location = LocationRowRepository::new(con)
            .find_one_by_id(&self.location_id)?
            .map(|r| r.store_id);

        let store_id_asset = AssetRowRepository::new(con)
            .find_one_by_id(&self.asset_id)?
            .and_then(|r| r.store_id);

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetInternalLocation,
            record_id: self.id.clone(),
            row_action: action,
            store_id: store_id_location.or(store_id_asset),
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }

    pub(crate) fn delete_changelog(
        row_id: &str,
        con: &StorageConnection,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = AssetInternalLocationRowRepository::new(con)
            .find_one_by_id(row_id)?
            .ok_or(RepositoryError::NotFound)?;
        row.changelog(con, RowActionType::Delete, source_site_id)
    }
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
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_internal_location_row)?;
        let changelog = asset_internal_location_row.changelog(
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

    pub fn delete(&self, asset_internal_location_id: &str) -> Result<i64, RepositoryError> {
        let changelog = match AssetInternalLocationRow::delete_changelog(
            asset_internal_location_id,
            self.connection,
            SourceSiteId::CurrentSiteId,
        ) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => {
                return Ok(0); // already deleted?
            }
            Err(e) => return Err(e),
        };
        let change_log_id = ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(asset_internal_location)
            .filter(id.eq(asset_internal_location_id))
            .execute(self.connection.lock().connection())?;

        Ok(change_log_id)
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
}

impl Upsert for AssetInternalLocationRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetInternalLocationRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.changelog(
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetInternalLocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct AssetInternalLocationRowDelete(pub String);
impl Delete for AssetInternalLocationRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                AssetInternalLocationRow::delete_changelog(
                    &self.0,
                    con,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(asset_internal_location.filter(id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetInternalLocationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        );
    }
}
