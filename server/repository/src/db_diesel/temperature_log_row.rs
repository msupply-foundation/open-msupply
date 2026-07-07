use super::{sensor_row::sensor, store_row::store, StorageConnection};

use crate::{
    repository_error::RepositoryError, ChangelogSyncType, SourceSiteId, Upsert,
};
use crate::{ChangelogRepository, RowActionType};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    temperature_log (id) {
        id -> Text,
        temperature -> Double,
        sensor_id -> Text,
        location_id -> Nullable<Text>,
        store_id -> Text,
        datetime -> Timestamp,
        temperature_breach_id -> Nullable<Text>,
    }
}

joinable!(temperature_log -> sensor (sensor_id));
joinable!(temperature_log -> store (store_id));

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = temperature_log)]
pub struct TemperatureLogRow {
    pub id: String,
    pub temperature: f64,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub store_id: String,
    pub datetime: NaiveDateTime,
    pub temperature_breach_id: Option<String>,
}
pub struct TemperatureLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureLogRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &TemperatureLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(temperature_log::table)
            .values(row)
            .on_conflict(temperature_log::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureLogRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn update_breach_id(
        &self,
        breach_id: &str,
        temperature_log_ids: &Vec<String>,
    ) -> Result<(), RepositoryError> {
        diesel::update(temperature_log::table)
            .filter(temperature_log::id.eq_any(temperature_log_ids))
            .set(temperature_log::temperature_breach_id.eq(breach_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn update_location_id_by_sensor_id(
        &self,
        sensor_id: &str,
        location_id: &str,
    ) -> Result<(), RepositoryError> {
        let rows_updated = diesel::update(temperature_log::table)
            .filter(temperature_log::sensor_id.eq(sensor_id))
            .filter(temperature_log::location_id.is_null())
            .set(temperature_log::location_id.eq(Some(location_id)))
            .execute(self.connection.lock().connection())?;

        if rows_updated == 0 {
            return Ok(());
        }

        let logs = temperature_log::table
            .filter(temperature_log::sensor_id.eq(sensor_id))
            .filter(temperature_log::location_id.eq(location_id))
            .load::<TemperatureLogRow>(self.connection.lock().connection())?;

        for log in &logs {
            let changelog = log.generate_changelog(
                self.connection,
                RowActionType::Upsert,
                SourceSiteId::CurrentSiteId,
            )?;
            ChangelogRepository::new(self.connection).insert(&changelog)?;
        }

        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<TemperatureLogRow>, RepositoryError> {
        let result = temperature_log::table
            .filter(temperature_log::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureLogRow>, RepositoryError> {
        Ok(temperature_log::table
            .filter(temperature_log::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for TemperatureLogRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        TemperatureLogRowRepository::new(con)._upsert_one(self)?;

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
            TemperatureLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
