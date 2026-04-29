use super::{
    assets::asset_internal_location_row::asset_internal_location, item_link_row::item_link,
    store_row::store, RepositoryError, StorageConnection,
};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, KeyValueStoreRepository,
    RowActionType,
};
use crate::{ChangelogSyncType, Delete, Upsert};
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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
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

impl LocationRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Location,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            name_id: None,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
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

    pub fn upsert_one(&self, row: &LocationRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
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

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = match self.find_one_by_id(id)? {
            Some(row) => row,
            None => return Ok(None),
        };

        let changelog = old_row.changelog(self.connection, RowActionType::Delete, None)?;
        let change_log_id = ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(location::table.filter(location::id.eq(id)))
            .execute(self.connection.lock().connection())?;

        Ok(Some(change_log_id))
    }
}

#[derive(Debug, Clone)]
// Only used in tests
pub struct LocationRowDelete(pub String);
impl Delete for LocationRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        LocationRowRepository::new(con).delete(&self.0)
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
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
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
