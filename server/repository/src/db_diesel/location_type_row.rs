use super::StorageConnection;

use crate::{
    db_diesel::changelog::{ChangeLogInsertRow, ChangelogRepository},
    repository_error::RepositoryError,
    ChangelogSyncType, ChangelogTableName, Delete, Upsert,
};

use diesel::prelude::*;

table! {
    location_type (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize,
)]
#[diesel(table_name = location_type)]
pub struct LocationTypeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
}

impl LocationTypeRow {
    pub fn table_name() -> ChangelogTableName {
        ChangelogTableName::LocationType
    }
    pub fn record_id(&self) -> String {
        self.id.clone()
    }
}

pub struct LocationTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationTypeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_type::table)
            .values(row)
            .on_conflict(location_type::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .filter(location_type::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .filter(location_type::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_type::table.filter(location_type::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Batch upsert. Does not write changelog rows.
    /// Single batched statement on Postgres; per-row loop on SQLite.
    pub fn _upsert_many(&self, rows: &[LocationTypeRow]) -> Result<(), RepositoryError> {
        if rows.is_empty() {
            return Ok(());
        }
        #[cfg(feature = "postgres")]
        {
            use diesel::upsert::excluded;
            diesel::insert_into(location_type::table)
                .values(rows)
                .on_conflict(location_type::id)
                .do_update()
                .set((
                    location_type::name.eq(excluded(location_type::name)),
                    location_type::min_temperature.eq(excluded(location_type::min_temperature)),
                    location_type::max_temperature.eq(excluded(location_type::max_temperature)),
                ))
                .execute(self.connection.lock().connection())?;
        }
        #[cfg(not(feature = "postgres"))]
        {
            for row in rows {
                diesel::insert_into(location_type::table)
                    .values(row)
                    .on_conflict(location_type::id)
                    .do_update()
                    .set(row)
                    .execute(self.connection.lock().connection())?;
            }
        }
        Ok(())
    }

    /// Batch hard-delete as a single SQL statement. Does not write changelog rows.
    pub fn delete_many(&self, ids: &[String]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(location_type::table.filter(location_type::id.eq_any(ids)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct LocationTypeRowDelete(pub String);
impl Delete for LocationTypeRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        LocationTypeRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }
    fn delete_v7(
        &self,
        con: &StorageConnection,
        changelog: ChangeLogInsertRow,
    ) -> Result<(), RepositoryError> {
        LocationTypeRowRepository::new(con).delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for LocationTypeRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        LocationTypeRowRepository::new(con).upsert_one(self)?;
        match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { .. } => Ok(()),
            ChangelogSyncType::SyncTypeV7 { changelog_row } => {
                ChangelogRepository::new(con).insert(&changelog_row)?;
                Ok(())
            }
        }
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
