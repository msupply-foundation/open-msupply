use super::{
    assets::asset_internal_location_row::asset_internal_location, item_link_row::item_link,
    store_row::store, RepositoryError, StorageConnection,
};
use crate::db_diesel::changelog::changelog::RowOrId;
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, Delete, SourceSiteId, Upsert};
use diesel::prelude::*;

table! {
    location (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        on_hold -> Bool,
        store_id -> Text,
        location_type_id -> Nullable<Text>,
        volume -> Double
    }
}

joinable!(location -> store (store_id));
allow_tables_to_appear_in_same_query!(location, item_link);
allow_tables_to_appear_in_same_query!(location, asset_internal_location);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = location)]
#[diesel(treat_none_as_null = true)]
pub struct LocationRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub on_hold: bool,
    pub store_id: String,
    pub location_type_id: Option<String>,
    pub volume: f64,
}
pub struct LocationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationRowRepository { connection }
    }

    fn _upsert_one(&self, row: &LocationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location::table)
            .values(row)
            .on_conflict(location::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &LocationRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = LocationRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationRow>, RepositoryError> {
        match location::table
            .filter(location::id.eq(id))
            .first(self.connection.lock().connection())
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<LocationRow>, RepositoryError> {
        Ok(location::table
            .filter(location::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = LocationRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(location::table.filter(location::id.eq(id)))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
// Only used in tests
pub struct LocationRowDelete(pub String);
impl Delete for LocationRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => LocationRow::generate_changelog(
                RowOrId::Id(&self.0),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(location::table.filter(location::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for LocationRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        LocationRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => LocationRow::generate_changelog(
                RowOrId::Row(self),
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
            LocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
