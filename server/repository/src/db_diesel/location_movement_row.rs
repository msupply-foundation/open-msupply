use super::{
    location_row::location, stock_line_row::stock_line, store_row::store, StorageConnection,
};
use crate::{repository_error::RepositoryError, ChangelogSyncType, SourceSiteId, Upsert};
use crate::{ChangelogRepository, RowActionType};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    location_movement (id) {
        id -> Text,
        store_id -> Text,
        stock_line_id -> Text,
        location_id -> Nullable<Text>,
        enter_datetime -> Nullable<Timestamp>,
        exit_datetime -> Nullable<Timestamp>,
    }
}

joinable!(location_movement -> store (store_id));
joinable!(location_movement -> stock_line (stock_line_id));
joinable!(location_movement -> location (location_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = location_movement)]
pub struct LocationMovementRow {
    pub id: String,
    pub store_id: String,
    pub stock_line_id: String,
    pub location_id: Option<String>,
    pub enter_datetime: Option<NaiveDateTime>,
    pub exit_datetime: Option<NaiveDateTime>,
}
pub struct LocationMovementRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationMovementRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationMovementRowRepository { connection }
    }

    fn _upsert_one(&self, row: &LocationMovementRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_movement::table)
            .values(row)
            .on_conflict(location_movement::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &LocationMovementRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationMovementRow>, RepositoryError> {
        let result = location_movement::table
            .filter(location_movement::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_movement::table.filter(location_movement::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<LocationMovementRow>, RepositoryError> {
        Ok(location_movement::table
            .filter(location_movement::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for LocationMovementRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        LocationMovementRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
            LocationMovementRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
