use super::StorageConnection;

use crate::{
    db_diesel::changelog::{ChangeLogInsertRow, ChangelogRepository},
    repository_error::RepositoryError,
    ChangelogTableName, Delete, Upsert,
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

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_type::table.filter(location_type::id.eq(id)))
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
    fn upsert(&self, con: &StorageConnection, changelog: Option<ChangeLogInsertRow>) -> Result<Option<i64>, RepositoryError> {
        LocationTypeRowRepository::new(con).upsert_one(self)?;
        match changelog {
            Some(changelog) => {
                let cursor_id = ChangelogRepository::new(con).insert(&changelog)?;
                Ok(Some(cursor_id))
            }
            None => Ok(None),
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
