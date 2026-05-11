use super::StorageConnection;

use crate::{
    db_diesel::changelog::ChangelogRepository,
    repository_error::RepositoryError,
    ChangelogSyncType, ChangelogTableName, RowActionType, SourceSiteId, Upsert,
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

    fn _upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_type::table)
            .values(row)
            .on_conflict(location_type::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = LocationTypeRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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
}

impl Upsert for LocationTypeRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        LocationTypeRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                LocationTypeRow::generate_changelog(
                    self.id.clone(),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
