use super::{location_row::location, store_row::store, StorageConnection};

use crate::{repository_error::RepositoryError, ChangelogSyncType, Delete, SourceSiteId, Upsert};
use crate::{ChangelogRepository, RowActionType};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    sensor (id) {
        id -> Text,
        name -> Text,
        serial -> Text,
        location_id -> Nullable<Text>,
        store_id -> Text,
        battery_level -> Nullable<Integer>,
        log_interval -> Nullable<Integer>,
        is_active -> Bool,
        last_connection_datetime -> Nullable<Timestamp>,
        #[sql_name = "type"] type_ -> crate::db_diesel::sensor_row::SensorTypeMapping,
    }
}

joinable!(sensor -> store (store_id));
joinable!(sensor -> location (location_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SensorType {
    #[default]
    BlueMaestro,
    Laird,
    Berlinger,
    LogTag,
}

// TODO put this somewhere more sensible
// perhaps the cold chain service
pub fn get_sensor_type(serial: &str) -> SensorType {
    match serial.split('|').nth(1) {
        Some("BLUE_MAESTRO") => SensorType::BlueMaestro,
        Some("LAIRD") => SensorType::Laird,
        Some("BERLINGER") => SensorType::Berlinger,
        Some("LOG_TAG") => SensorType::LogTag,
        _ => SensorType::BlueMaestro,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize, Deserialize, Default,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sensor)]
pub struct SensorRow {
    pub id: String,
    pub name: String,
    pub serial: String,
    pub location_id: Option<String>,
    pub store_id: String,
    pub battery_level: Option<i32>,
    pub log_interval: Option<i32>,
    pub is_active: bool,
    pub last_connection_datetime: Option<NaiveDateTime>,
    #[diesel(column_name = "type_")]
    pub r#type: SensorType,
}
pub struct SensorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SensorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SensorRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sensor::table)
            .values(row)
            .on_conflict(sensor::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SensorRow>, RepositoryError> {
        let result = sensor::table
            .filter(sensor::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SensorRow>, RepositoryError> {
        Ok(sensor::table
            .filter(sensor::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _mark_deleted(&self, sensor_id: &str) -> Result<(), RepositoryError> {
        diesel::update(sensor::table)
            .filter(sensor::id.eq(sensor_id))
            .set(sensor::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct SensorRowDelete(pub String);

impl Delete for SensorRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = SensorRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                let row = repo
                    .find_one_by_id(&self.0)?
                    .ok_or_else(|| RepositoryError::NotFound)?;
                row.generate_changelog(
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._mark_deleted(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        let row = SensorRowRepository::new(con)
            .find_one_by_id(&self.0)
            .expect("sensor lookup");
        assert_eq!(row.map(|r| r.is_active), Some(false));
    }
}

impl Upsert for SensorRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SensorRowRepository::new(con)._upsert_one(self)?;

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
            SensorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
