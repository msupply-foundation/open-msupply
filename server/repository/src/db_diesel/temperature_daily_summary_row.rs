use super::{StorageConnection, sensor_row::sensor, store_row::store};

use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, SourceSiteId, Upsert, repository_error::RepositoryError};

use chrono::NaiveDate;
use diesel::prelude::*;
use std::any::Any;

table! {
    temperature_daily_summary (id) {
        id -> Text,
        store_id -> Text,
        sensor_id -> Text,
        location_id -> Nullable<Text>,
        date -> Date,
        minimum_temperature -> Nullable<Double>,
        maximum_temperature -> Nullable<Double>,
        average_temperature -> Nullable<Double>,
        hot_duration_milliseconds -> Nullable<Integer>,
        cold_duration_milliseconds -> Nullable<Integer>,
        hot_threshold -> Nullable<Double>,
        cold_threshold -> Nullable<Double>,
    }
}

joinable!(temperature_daily_summary -> sensor (sensor_id));
joinable!(temperature_daily_summary -> store (store_id));

/// A sensor's own summary of a day, as recorded by the sensor (e.g. a Fridge-tag's history).
/// The hot & cold durations are the total time that day above `hot_threshold` / below
/// `cold_threshold`, whether or not an alarm (breach) was triggered. A sensor has one summary
/// per day (unique on `sensor_id` & `date`).
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
#[diesel(table_name = temperature_daily_summary)]
pub struct TemperatureDailySummaryRow {
    pub id: String,
    pub store_id: String,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub date: NaiveDate,
    pub minimum_temperature: Option<f64>,
    pub maximum_temperature: Option<f64>,
    pub average_temperature: Option<f64>,
    pub hot_duration_milliseconds: Option<i32>,
    pub cold_duration_milliseconds: Option<i32>,
    pub hot_threshold: Option<f64>,
    pub cold_threshold: Option<f64>,
}

pub struct TemperatureDailySummaryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureDailySummaryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureDailySummaryRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &TemperatureDailySummaryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(temperature_daily_summary::table)
            .values(row)
            .on_conflict(temperature_daily_summary::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureDailySummaryRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<TemperatureDailySummaryRow>, RepositoryError> {
        let result = temperature_daily_summary::table
            .filter(temperature_daily_summary::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// Existence check on the natural key of a summary: a sensor has one summary per day. Used
    /// to update the day's summary on a re-import, and to de-duplicate summaries that arrive
    /// from multiple devices reading the same Fridge-tag (each device assigns its own `id`).
    pub fn find_id_by_sensor_and_date(
        &self,
        sensor_id: &str,
        date: NaiveDate,
    ) -> Result<Option<String>, RepositoryError> {
        let result = temperature_daily_summary::table
            .filter(temperature_daily_summary::sensor_id.eq(sensor_id))
            .filter(temperature_daily_summary::date.eq(date))
            .select(temperature_daily_summary::id)
            .first::<String>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureDailySummaryRow>, RepositoryError> {
        Ok(temperature_daily_summary::table
            .filter(temperature_daily_summary::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_sensor_id(
        &self,
        sensor_id: &str,
    ) -> Result<Vec<TemperatureDailySummaryRow>, RepositoryError> {
        Ok(temperature_daily_summary::table
            .filter(temperature_daily_summary::sensor_id.eq(sensor_id))
            .order(temperature_daily_summary::date.asc())
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for TemperatureDailySummaryRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        TemperatureDailySummaryRowRepository::new(con)._upsert_one(self)?;

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
            TemperatureDailySummaryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }

    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        Some(self)
    }
}
